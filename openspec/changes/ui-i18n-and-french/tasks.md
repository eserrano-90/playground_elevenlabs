## 1. Scenario languages (French backend)

- [x] 1.1 Add `SCENARIO_LANGUAGES = ["en", "es", "fr"]` and `ScenarioLanguage` to `src/lib/validation.ts`; make the scenario `language` a `z.enum` and use it in `generateInputSchema`; add validation tests (accepts `fr`, rejects `de`)
- [x] 1.2 Add `fr: "French"` to the generator's `LANGUAGE_NAMES`; extend `generate.test.ts` to assert the French language line reaches the prompt
- [x] 1.3 Implement `syllablesFr` in `src/lib/analysis/text.ts` and route `syllables()` by language; unit-test on a French word list
- [x] 1.4 Add Kandel–Moles (`kandel-moles`) to `readability()` in `metrics.ts` via a per-language lookup; add `kandelMolesEase: [100, 0]` to `COMPOSITE_RANGES` and use it in `compositeScore`; tests for formula selection and for easier text scoring lower
- [x] 1.5 Add `ENGLISH_ONLY_TTS_MODELS` to `agent-config.ts` and a pure `incompatiblePairs(variants, scenarios)` helper with tests

## 2. French templates

- [x] 2.1 Alias `TemplateLanguage` to `ScenarioLanguage`, add `fr` to `TEMPLATE_LANGUAGES`, and write French variants for customer service, restaurant booking and medical appointment (same guardrails, spoken numbers and dates)
- [x] 2.2 Update `templates.test.ts`: every template has en/es/fr, every variant validates, and the French medical template keeps the scheduling-only and emergency guardrails

## 3. i18n infrastructure

- [x] 3.1 Create `src/lib/i18n/config.ts` (`LOCALES`, `Locale`, `DEFAULT_LOCALE`, `isLocale`, `LOCALE_COOKIE`, a native-name map) and `matchAcceptLanguage(header)`, with tests (es-MX → es, de-DE → en, q-ordering)
- [x] 3.2 Create `src/lib/i18n/dictionaries/en.ts` (shape and `Dictionary` type) plus `es.ts` and `fr.ts` stubs declared `satisfies Dictionary`, starting with `common`, `nav`, `status` and `languages`
- [x] 3.3 Create server helpers `getLocale()` (cookie, then `Accept-Language`, then `en`) and `getT()` in `src/lib/i18n/server.ts` (server-only)
- [x] 3.4 Create client `I18nProvider`, `useT()`, `useLocale()` and `useFormat()` in `src/lib/i18n/client.tsx`
- [x] 3.5 Add `createFormatters(locale)` to `src/lib/format.ts` (usd, ms, num, secs, date via explicit-locale `Intl`); keep existing exports as en wrappers; test fr output ("30,7", French month names)
- [x] 3.6 Add the `<Rich text>` component (`**bold**`, `*em*`, `` `code` `` only) with tests
- [x] 3.7 Add the `setLocale` server action (validates the locale; cookie with 1-year max-age, `sameSite=lax`, `path=/`)

## 4. Shell: layout, nav, switcher

- [x] 4.1 Root layout: `<html lang={locale}>`, wrap in `I18nProvider`, and localize metadata
- [x] 4.2 Nav: translated labels (keep `data-tour` ids stable), plus a `LanguageSwitcher` dropdown (English / Español / Français) that calls `setLocale` and then `router.refresh()`
- [x] 4.3 Localize shared components: `page-header` consumers, `status-badge`, `confirm-button`, `field` hints, `native-select`, and `results/*` tables and charts (column headers, tooltips, empty states)

## 5. Pages

- [x] 5.1 Benchmarks list (`/`) and new-benchmark form, including the language/TTS compatibility `Alert` fed by variant `ttsModel` and scenario `language`
- [x] 5.2 Benchmark detail (`benchmark-view.tsx`): header, actions, highlights, tabs, compare, runs and footnote
- [x] 5.3 Run detail (`/runs/[id]`)
- [x] 5.4 Variants manager
- [x] 5.5 Scenarios manager and generate dialog: labels, the template picker (with a Français radio), the language select from `SCENARIO_LANGUAGES` with `t.languages.*`, and new scenarios defaulting to the UI language
- [x] 5.6 Live page and live session
- [x] 5.7 Settings view (all three tabs)
- [x] 5.8 Metrics page: move prose to `t.metrics.*` using `<Rich>` and pass code constants as arguments; add the French readability row (Kandel–Moles)
- [x] 5.9 Client-created toasts and confirmation dialogs across pages (server/API messages stay as returned)

## 6. Tours

- [x] 6.1 Change `tourForPath(pathname, t)` to build steps from `t.tours.*`; `TourProvider` uses `useT()`; tour UI labels (Back, Next, Skip, Done, "n of total", tooltip) come from the dictionary; storage keys stay per tour id

## 7. Translations

- [x] 7.1 Fill `es.ts` completely (typecheck passes with no missing keys)
- [x] 7.2 Fill `fr.ts` completely (typecheck passes with no missing keys)
- [x] 7.3 Sweep for leftover literals: grep JSX text nodes and `toast.`/`title=`/`placeholder=`/`aria-label=` strings in `src/app` and `src/components`, and fix any found

## 8. Verification

- [x] 8.1 `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` pass
- [x] 8.2 Playwright: switch en → es → fr on `/scenarios` (route kept, choice survives reload); first visit with `Accept-Language: es-MX` renders Spanish and `lang="es"`; `de-DE` renders English; no hydration warnings in the console
- [x] 8.3 Playwright: screenshot every page and the home tour in `fr`; check nav and buttons at 1024 px and 375 px for overflow
- [x] 8.4 Playwright: apply the French "Medical appointment" template and save; the new-benchmark form warns for a French scenario with an `eleven_flash_v2` variant
- [ ] 8.5 Manual (user): run one benchmark with a French scenario against the real ElevenLabs API and confirm the agent speaks French and the readability formula is `kandel-moles`
- [ ] 8.6 Manual (user, optional): a native speaker reviews the es/fr dictionaries and the French templates
