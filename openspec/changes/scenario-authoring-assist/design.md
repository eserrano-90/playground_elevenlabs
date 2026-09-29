## Context

Scenarios are written by hand in `src/app/scenarios/scenarios-manager.tsx` and validated by `scenarioInputSchema` (`src/lib/validation.ts`). The app already talks to LLMs through the Vercel AI SDK (`ai` v7 with `@ai-sdk/openai` and `@ai-sdk/anthropic`) for the optional judge (`src/lib/analysis/judge.ts`):

- Config comes from `JUDGE_PROVIDER`, `JUDGE_API_KEY` and `JUDGE_MODEL`.
- It uses `generateText` with `Output.object` and a Zod schema to get structured output.

Scenario languages are currently `en` and `es`.

## Goals / Non-Goals

**Goals:**
- One-call generation of a spoken-agent system prompt plus a first message, with optional simulated-user content and a suggested name.
- Three bilingual built-in templates that produce valid scenarios with no edits.
- No new dependencies or DB migrations; reuse the existing provider config.

**Non-Goals:**
- Streaming token-by-token output. Drafts are short, so a spinner is enough.
- User-defined or DB-stored templates, and template sharing.
- Iterative chat refinement ("make it friendlier"). Users can edit the text or regenerate.
- Calling ElevenLabs or validating the prompt against a live agent.

## Decisions

### D1. Shared model factory in `src/lib/ai/model.ts`
Extract `judgeModel()` into `getAssistModel(purpose: "judge" | "assist")`, which returns `{ model, id }`.
- `assist` uses `ASSIST_MODEL ?? JUDGE_MODEL` with the same provider and key.
- Add `isAssistConfigured(env)`, which uses the same check as the judge.
- *Alternative:* separate `ASSIST_PROVIDER` and `ASSIST_API_KEY` variables. Rejected: more config for little gain. A model override covers the common "use a cheaper or better model for writing" case.

### D2. Structured output with Zod
`generateScenarioDraft(input)` in `src/lib/scenarios/generate.ts` calls `generateText({ model, output: Output.object({ schema: draftSchema }), system, prompt, temperature: 0.7 })`. The schema has:
- `name`, `systemPrompt`, `firstMessage`;
- optional `scriptedTurns: string[]` (3–6 items) and `personaPrompt`.

The schema is built per request. It includes only the simulated-user field for the requested mode, and only when `includeUser` is true, so the model can't return both.
- *Alternative:* free text split by markers. Rejected: fragile, and the project already uses `Output.object` for the judge.

### D3. Prompt content follows voice-agent best practice
The generator's system instruction asks for a prompt with these labelled plain-text sections:
- Personality, Environment, Tone, Goal and Guardrails. These mirror the ElevenLabs agent prompting guide.
- Spoken-style rules: no markdown or lists, 1–3 sentences per turn, spell out numbers and dates, and ask one question at a time.
- It must be written in the target language.

The first message must be one or two spoken sentences. Keeping the instruction in one exported constant makes it unit-testable and easy to tune.

### D4. Endpoint `POST /api/scenarios/generate`
- **Input:** Zod `generateInputSchema` with:
  - `description`: 10–1000 characters;
  - `language`: `en` | `es`;
  - `tone`: optional, up to 60 characters;
  - `userMode`: `scripted` | `persona`;
  - `includeUser`: boolean.
- **Responses:**
  - 200 with `{ draft, model }`;
  - 400 with field errors, using the existing `fieldErrors` / API helper conventions;
  - 503 when the assistant is not configured;
  - 502 on a provider error or timeout.
- **Timeout:** 45 s, set with `abortSignal: AbortSignal.timeout(45_000)`.
- **Runtime:** runs on the Node runtime like the other routes. Nothing is persisted.

### D5. Templates as a typed static module
`src/lib/scenarios/templates.ts` exports `SCENARIO_TEMPLATES: { id, title, description, icon, variants: Record<"en" | "es", ScenarioInput> }[]`.
- It covers `customer-service`, `restaurant-booking` and `medical-appointment`.
- Customer service and restaurant use scripted mode, so comparisons are deterministic. Medical appointment uses scripted mode too, and its persona prompt is kept as an alternative the user can switch to.
- `GET /api/scenarios/templates` returns the list. The page can also import it directly as a server-component prop, which avoids a fetch; the endpoint exists for parity with the other resources.
- A unit test parses every template through `scenarioInputSchema`.
- The medical template's guardrails must say the agent schedules only and gives no medical advice.
- *Alternative:* seed templates as DB scenarios. Rejected: it clutters the user's list and needs migration or seed logic. Static templates are versioned with the code.

### D6. UI flow on the scenarios page
- **Form card header:** two actions, "Templates" and "Generate with AI".
  - "Templates" opens a dropdown menu of the templates (title and description) with an EN/ES choice. It defaults to the form's current language.
  - "Generate with AI" opens a Dialog. The Dialog's fields are:
    - description textarea, prefilled from the form name if one is set;
    - language, defaulting to the form's language;
    - tone input;
    - "Include simulated user" switch, default on when the turns / persona field is empty.
- **Generating:** the Generate button shows a spinner.
- **Preview:** the Dialog shows the result read-only in the same Dialog, with Regenerate, Back and Apply buttons.
- **Apply:** fills only the fields present in the draft, and sets the name only when the form name is empty.
- **Overwrite check:** a "dirty" check (any target field non-empty) triggers a ConfirmButton-style AlertDialog before overwriting, for both templates and drafts.
- **Not configured:** the Generate action is disabled, with a Tooltip listing the missing env vars. The page passes `assistAvailable` from the server component.
- **Errors:** shown as a toast. The dialog stays open with the inputs kept.

## Risks / Trade-offs

- [LLM returns output that fails the schema] → The AI SDK throws `NoObjectGeneratedError`; return a 502 with a "try again" message. Keep the schema lenient on lengths and trim on the server.
- [Generated prompts vary in quality or length] → Instruct a target of under 250 words and cap `maxOutputTokens` at about 1200. The user reviews every draft before applying.
- [Cost surprise] → One short call per click on the user's own provider key, and the dialog footer states which model will be used. No automatic or background generation.
- [Medical template seen as advice] → The template guardrails forbid diagnosis and advice and redirect emergencies to emergency services.
- [Prompt injection through the description] → Low impact: the output is only shown to the same user and never executed. The description is passed as data inside a delimited block.
- [Judge and assist share one key] → Acceptable for a local single-user tool. Documented in the README.

## Migration Plan

- No DB changes. `ASSIST_MODEL` is optional and backward-compatible.
- Rollback means reverting the code; existing scenarios are unaffected.

## Open Questions

- More templates (for example tech support or a sales qualifier) can be added later without spec changes, beyond the required three.
