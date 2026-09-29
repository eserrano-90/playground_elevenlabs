## Context

The app is a local, single-user Next.js 16 App Router tool (React 19, Tailwind v4, shadcn base-nova on Base UI).

**UI strings today:**
- Every string is an English literal inside roughly 35 pages and components.
- Tours live in `src/lib/tours.ts`.
- The Metrics page (`src/app/metrics/page.tsx`) is long rich text.
- `src/lib/format.ts` formats dates with a fixed `en-GB` locale to avoid hydration mismatches.

**Scenario language today:**
- It's a free string in the scenario schema; the generate endpoint accepts `en | es`.
- Templates have `en`/`es` variants.
- Readability branches on `language.startsWith("es")`; anything else falls through to Flesch–Kincaid.
- The ElevenLabs agent is created with `conversation_config.agent.language = scenario.language`.
- `eleven_flash_v2` and `eleven_turbo_v2` are English-only TTS models, but nothing warns about pairing them with a non-English scenario.

There are no i18n libraries installed. The Next.js 16 guide (`node_modules/next/dist/docs/01-app/02-guides/internationalization.md`) describes locale sub-path routing with `app/[lang]` plus plain dictionaries, and leaves the localization mechanism to the app.

## Goals / Non-Goals

**Goals:**
- UI in en/es/fr with a persistent switcher and an `Accept-Language` default.
- Complete, type-checked dictionaries.
- Locale-aware dates and numbers.
- French as a first-class scenario language: validation, templates, generation, agent language and readability.
- Warn about non-English scenarios on English-only TTS models.
- No new dependencies. Existing URLs keep working.

**Non-Goals:**
- Translating server/API error messages. Zod messages and `HttpError` text stay English and are shown as-is in toasts.
- Translating model-facing prompts: the judge rubric and the scenario writer instruction.
- Translating user content: scenario and variant names, prompts, transcripts.
- Translating CSV/JSON export headers, which are machine-readable.
- Locale-prefixed URLs and SEO. This is a local tool.
- Right-to-left languages, or languages beyond en/es/fr.

## Decisions

### 1. Store the locale in a cookie, with no `[lang]` route segment
- `getLocale()` (server-only) reads a `locale` cookie. If it's missing, it parses `Accept-Language` from `headers()` with a small matcher (quality-sorted, primary subtag) and falls back to `en`.
- The root layout sets `<html lang>` and mounts `I18nProvider locale={locale}`.
- **Alternative: sub-path routing (`/fr/variants`).** Rejected. It would move every route under `app/[lang]`, add a proxy for redirects, and break existing links, bookmarks and `href`s. Its SEO benefit is irrelevant here.
- **Alternative: `next-intl`.** Rejected. It adds a dependency and config surface for three languages that plain typed objects handle.
- Reading `cookies()` makes pages dynamic. Every data page already sets `force-dynamic`; only `/metrics` becomes dynamic, which is acceptable.

### 2. Typed TypeScript dictionaries bundled on the client
- `src/lib/i18n/dictionaries/en.ts` defines the shape. `es.ts` and `fr.ts` are declared `satisfies Dictionary`, so a missing or extra key fails `tsc`.
- *Implementation note:* the dictionaries are split per namespace instead of per locale. `src/lib/i18n/dictionaries/<namespace>.ts` holds `const en = {...}` plus `es: typeof en` and `fr: typeof en` side by side, and `index.ts` assembles `DICTIONARIES[locale]` and the `Dictionary` type. The type guarantee is the same. Translations of a string sit next to each other, and pages can be extracted in parallel without editing a shared file.
- Parametrized strings are functions, for example `runsDone: (done: number, total: number) => ...`. They're type-safe and need no ICU parser.
- Plurals use `Intl.PluralRules` inside those functions when needed.
- Functions can't cross the server→client props boundary. So the client provider imports all three dictionaries itself and receives only the `locale` string.
- Three small dictionaries in the client bundle is an acceptable cost.
- **Alternative: JSON dictionaries with `{placeholders}`.** Rejected. They're untyped, and they would need an interpolation or plural parser.

### 3. Access API
- Client components call `useT()` to get the typed dictionary (`t.variants.title`) and `useFormat()` to get locale-bound formatters.
- Server components call `await getT()` and `getFormat(locale)`.
- Keys are grouped by page or feature: `nav`, `common`, `status`, `languages`, `variants`, `scenarios`, `benchmarks`, `runs`, `live`, `settings`, `metrics`, `tours`.
- Scenario language labels come from `t.languages.<code>`. The switcher lists each language in its own name (English, Español, Français) regardless of the active locale.

### 4. Switcher sets the cookie through a server action, then refreshes
- A `setLocale(locale)` server action validates the locale, sets the cookie (1 year, `sameSite=lax`, `path=/`) and returns.
- The client then calls `router.refresh()`, so server components re-render in the new language while client state and the route are kept.
- The switcher is a `DropdownMenu` with a `LanguagesIcon` trigger, placed next to the tour button.

### 5. Locale-aware formatting
- `format.ts` gets factory versions that take a locale: `createFormatters(locale)` returns `usd`, `ms`, `num`, `secs` and `date`.
- Each uses `Intl.NumberFormat`/`DateTimeFormat` with the explicit locale, so server and client output match.
- USD stays the currency (`style: "currency", currency: "USD"`), rendered per locale; in French this is "0,10 $US".
- The current exports remain as `en` wrappers for non-UI callers such as tests and CSV.

### 6. Rich text in dictionaries
- The Metrics page and a few descriptions need bold, italic and code spans.
- Dictionary strings may use `**bold**`, `*em*` and `` `code` ``. A tiny `<Rich text=… />` component renders those three marks and nothing else.
- Values the page reads from code (weights, ranges, `MATTR_WINDOW`) are passed as function arguments, so the page stays in sync with the code.
- **Alternative: per-locale `.tsx` content components.** Rejected. Structure would drift between languages, and the type check wouldn't catch missing sections.

### 7. Tours take a dictionary
- `tourForPath(pathname, t)` builds steps from `t.tours.*`. Tour ids and `data-tour` targets are unchanged.
- The localStorage completion key is per tour id, not per locale, so a tour finished in one language counts as finished in every language.

### 8. One source of truth for scenario languages
- `SCENARIO_LANGUAGES = ["en", "es", "fr"] as const` and `type ScenarioLanguage` go in `src/lib/validation.ts`.
- The following use it:
  - the scenario schema, which becomes a `z.enum` (breaking only for API callers sending other codes);
  - `generateInputSchema`;
  - `TemplateLanguage` (now an alias);
  - the scenario form's language select;
  - the template language radio;
  - the generate dialog;
  - `LANGUAGE_NAMES` in the generator (`fr: "French"`).
- Existing rows are `en`/`es`, so no migration is needed.

### 9. French readability: Kandel–Moles
- Formula: `207 − 1.015 × (words/sentences) − 73.6 × (syllables/words)`. It's the French adaptation of Flesch reading ease: 0–100, higher means easier.
- Formula id: `kandel-moles`. The selection logic moves from `startsWith("es")` to a lookup keyed by `ScenarioLanguage`, with English as the default.
- `syllablesFr` counts vowel groups over `aeiouyàâäéèêëîïôöùûüœæ`. It drops a final silent `e`/`es` when the word has more than one group, and does not subtract `-ent`, which is ambiguous between verbs and nouns. It's documented as a heuristic, like the English and Spanish ones.
- The composite adds a `kandelMolesEase: [100, 0]` range, inverted like Fernández-Huerta.
- The Metrics page gains a French row.

### 10. French templates
- Each of the three templates gets a hand-written `fr` variant, equivalent to en/es. It keeps the same guardrails, including "prise de rendez-vous uniquement" and the emergency redirect for the medical template.
- Names, numbers and dates are spelled the way they're spoken, as in the other variants.
- The existing template test ("every variant is a valid scenario") covers the French variants automatically.

### 11. Language/TTS compatibility warning
- `ENGLISH_ONLY_TTS_MODELS = ["eleven_flash_v2", "eleven_turbo_v2"]` lives next to `CONVERSATIONAL_TTS_MODELS`.
- The new-benchmark page passes each variant's `ttsModel` and each scenario's `language` to the form.
- The form computes the incompatible pairs from the current selection and shows an `Alert` listing them. It doesn't block starting the benchmark.
- **Alternative: read `languages` from `/v1/models`.** Rejected. It would add an API call to page load, and the list of English-only models is small and stable.

## Risks / Trade-offs

- **Literals missed during extraction** leave English strings in the es/fr UI. → Extract page by page with a checklist, then do a full sweep in `fr` with Playwright screenshots of every page. Grep for JSX text nodes that start with a capital letter.
- **Large diff across about 35 files** is hard to review and conflicts with other work. → Implement in slices (infrastructure, then nav and layout, then one page at a time), each type-checked and working on its own.
- **Longer French and Spanish strings** can overflow the nav and buttons. → Check the nav at 1024 px and 375 px in `fr`. Nav labels may truncate or collapse to icons on narrow widths.
- **Translation quality**, because strings are machine-assisted. → Keep strings short. Open question: native review of es/fr.
- **Kandel–Moles and the French syllable heuristic are approximate.** → Compare only within a language, as the Metrics page already advises. Unit-test the syllable counts on a word list.
- **Hydration mismatch** from locale formatting. → Always pass the explicit locale to `Intl`, never the runtime default. Server and client get the same locale from the cookie and the provider.
- **API error toasts stay English** in an es/fr UI. → Accepted non-goal. Client-side validation hints and labels are translated; server messages may be localized later.

## Migration Plan

- No data migration.
- On first load after deploy, the cookie is absent and the locale comes from `Accept-Language`.
- Rollback is a code revert. The leftover `locale` cookie is harmless.
- Archive `elevenlabs-agent-benchmark` and `scenario-authoring-assist` before archiving this change, because its delta specs modify their capabilities.

## Open Questions

- Should a native speaker review the es/fr dictionaries and the French templates before archiving? Recommended; tracked as a manual task.
- Should the scenario form default the new scenario's language to the UI language? Proposed: yes, for new scenarios only. Cheap, and it can be reverted if it confuses users.
