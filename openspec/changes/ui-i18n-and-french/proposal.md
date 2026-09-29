## Why

The app is English-only, and its users include Spanish and French speakers who run benchmarks for agents in their own language. Scenarios can already be written in Spanish, but not French, and French-language metrics (readability) would be computed with the English formula, which gives meaningless numbers.

## What Changes

- **UI localization**: the interface (navigation, every page, forms, dialogs, toasts shown by the client, the guided tours and the Metrics page) is available in English, Spanish and French.
  - A language switcher in the nav bar changes the UI language and persists the choice.
  - The first visit follows the browser's `Accept-Language`, falling back to English.
  - Dates and numbers are formatted for the selected UI language.
  - The UI language is independent of the scenario language: an English UI can run a French scenario and vice versa.
- **French scenario language**: `fr` joins `en` and `es` everywhere a scenario language is chosen or used:
  - the scenario form and list;
  - the built-in templates (customer service, restaurant booking, medical appointment) gain French variants;
  - AI scenario generation accepts `fr`;
  - the ElevenLabs agent is created with `language: "fr"`.
- **French readability**: French runs use the Kandel–Moles reading-ease formula with a French syllable heuristic. Kandel–Moles is inverted in the composite score, as Fernández-Huerta is for Spanish.
- **Language/TTS compatibility warning**: selecting a non-English scenario with a variant whose TTS model is English-only shows a warning before the benchmark starts. This applies to Spanish today and French after this change.
- Scenario `language` is validated against the supported set (`en`, `es`, `fr`) instead of any 2–10 character string. **BREAKING** for API clients that send other codes. The app never wrote other codes, so existing data is unaffected.
- Out of scope, and staying in English:
  - server-generated error and validation messages returned by the API;
  - the LLM judge rubric;
  - the scenario writer instruction. These last two are model-facing, so outputs stay consistent.

## Capabilities

### New Capabilities
- `ui-localization`: UI language selection (switcher, persistence, `Accept-Language` default), translated interface strings in en/es/fr, and locale-aware date/number formatting.

### Modified Capabilities
- `benchmark-configuration`: scenario language is one of `en`, `es`, `fr`, plus the warning for incompatible language/TTS-model pairs when creating a benchmark.
- `response-complexity-analysis`: readability adds Kandel–Moles for French.
- `scenario-authoring`: templates and AI generation support French.

## Impact

- **Code**:
  - new `src/lib/i18n/` (locale config, typed dictionaries, server `getLocale`/`getDictionary`, client provider and `useT` hook);
  - `src/app/layout.tsx` (`<html lang>`, provider);
  - `src/components/nav.tsx` (switcher);
  - every page and client component under `src/app` and `src/components`, where literals move to dictionary keys;
  - `src/lib/tours.ts` (keys instead of literals);
  - `src/lib/format.ts` (locale parameter).
- **Analysis**: `src/lib/analysis/text.ts` and `metrics.ts` (French syllables and formula), `composite.ts` (French range).
- **Scenarios**: `src/lib/validation.ts` (shared `SCENARIO_LANGUAGES`), `src/lib/scenarios/templates.ts` (fr variants), `src/lib/scenarios/generate.ts` (language name).
- **Benchmark creation**: `src/app/benchmarks/new/*` (compatibility warning).
- **Dependencies**: none added. Localization uses plain typed dictionaries and a cookie, following the Next.js 16 internationalization guide without locale-prefixed routes.
- **Data**: no schema migration. `scenarios.language` is already text.
- **Order**: depends on archiving `elevenlabs-agent-benchmark` and `scenario-authoring-assist` first, because the modified capabilities come from those changes.
