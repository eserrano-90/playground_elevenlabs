## 1. AI Provider Setup

- [x] 1.1 Add optional `ASSIST_MODEL` to the env schema, `.env.example` and README (falls back to `JUDGE_MODEL`)
- [x] 1.2 Extract the provider factory into `src/lib/ai/model.ts` (`getAiModel("judge" | "assist")`, `isAssistConfigured`) and switch `judge.ts` to it
- [x] 1.3 Unit test: assist uses `ASSIST_MODEL` when set, otherwise `JUDGE_MODEL`; not configured when provider or key is missing

## 2. Scenario Templates

- [x] 2.1 Create `src/lib/scenarios/templates.ts` with typed `SCENARIO_TEMPLATES`: customer service, restaurant booking, medical appointment, each with `en` and `es` variants (spoken-style prompts, first message, scripted turns, persona alternative, max turns)
- [x] 2.2 Medical template guardrails: scheduling only, no medical advice, redirect emergencies
- [x] 2.3 Unit test: every template variant parses with `scenarioInputSchema`, and its language matches the variant key
- [x] 2.4 Add `GET /api/scenarios/templates` returning the template list

## 3. Draft Generation

- [x] 3.1 Add `generateInputSchema` (description 10–1000 chars, language `en|es`, optional tone ≤60, userMode, includeUser) in `src/lib/validation.ts`
- [x] 3.2 Implement `src/lib/scenarios/generate.ts`: exported voice-agent writing instruction, per-request draft Zod schema (user fields only for the requested mode when includeUser), `generateText` + `Output.object`, `maxOutputTokens` cap, 45 s timeout, trimmed output
- [x] 3.3 Add `POST /api/scenarios/generate`: 400 field errors, 503 when not configured (no LLM call), 502 on provider or schema failure, 200 `{ draft, model }`; nothing is persisted
- [x] 3.4 Unit test the generator with a mocked model (AI SDK `MockLanguageModel`): scripted vs persona schema shape, language passed through, and invalid input rejected before any model call

## 4. Scenarios UI

- [x] 4.1 Pass `assistAvailable`, the assist model id and the templates from `src/app/scenarios/page.tsx` to `ScenariosManager`
- [x] 4.2 Add a "Templates" dropdown menu to the form card (title, description, EN/ES), defaulting to the form language
- [x] 4.3 Add a "Generate with AI" dialog: description, language, tone, and "Include simulated user" switch; spinner while generating; disabled with a tooltip listing the missing env vars when not configured
- [x] 4.4 Draft preview in the dialog with Regenerate / Back / Apply; Apply fills only the draft's fields (the name only if empty) and never saves
- [x] 4.5 Overwrite confirmation (AlertDialog) when applying a template or draft to a form with content; cancelling keeps the current values
- [x] 4.6 Error toasts on generation failure; dialog inputs and form contents are preserved

## 5. Verification

- [x] 5.1 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pass
- [x] 5.2 Browser check: apply each template (EN and ES) and save; confirm the overwrite prompt; the generate action is disabled when the judge is not configured
- [ ] 5.3 Manual real-provider check: generate a draft in EN and ES with a configured judge key, apply it and save (run by the user)
