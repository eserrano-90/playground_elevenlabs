## Why

Writing a good voice-agent system prompt and opening line from scratch is slow, and weak prompts make benchmark results less meaningful. Built-in templates and one-click generation let users go from an idea ("dentist booking line") to a runnable, comparable scenario in seconds.

## What Changes

- Add a **"Generate with AI"** action to the scenario form. The user enters a short description, a language, and optionally a tone. The server calls an LLM through the Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, which are already dependencies) and returns a structured draft:
  - a system prompt and a first message;
  - optionally, simulated-user content (scripted turns or a persona prompt) and a suggested name.
- Show the draft in a preview dialog. The user applies it to the form; applying never saves automatically, and it asks before overwriting fields that aren't empty.
- Generation reuses the existing LLM-judge provider settings (`JUDGE_PROVIDER`, `JUDGE_API_KEY`, `JUDGE_MODEL`). An optional new `ASSIST_MODEL` overrides the model. When no provider is configured, the action is disabled and explains why.
- Add built-in **scenario templates**: "Customer service", "Restaurant booking" and "Medical appointment", each in English and Spanish.
  - Picking a template prefills the whole form: name, system prompt, first message, user mode, scripted turns / persona, and max turns.
  - Templates are static code, not database rows, so they need no migration. They can be edited before saving like any other draft.
- New endpoints: `POST /api/scenarios/generate` and `GET /api/scenarios/templates`.

## Capabilities

### New Capabilities

- `scenario-authoring`: AI-assisted generation of the scenario prompt and first message (plus optional simulated-user content), and built-in scenario templates that prefill the scenario form.

### Modified Capabilities

<!-- None. The base `benchmark-configuration` spec (scenario CRUD) is unchanged; this adds authoring aids on top of it. -->

## Impact

- **Code:**
  - New `src/lib/ai/model.ts`, a shared provider factory extracted from `src/lib/analysis/judge.ts`.
  - New `src/lib/scenarios/generate.ts` and `src/lib/scenarios/templates.ts`.
  - New API routes under `src/app/api/scenarios/`.
  - UI changes in `src/app/scenarios/scenarios-manager.tsx`: a template picker and the generate dialog.
- **Config:** `ASSIST_MODEL` (optional) in `src/lib/env.ts`, `.env.example` and the README.
- **Dependencies:** none new.
- **Cost:** one small LLM call per generation, billed to the configured judge provider account. ElevenLabs is not called.
- **Base change:** `elevenlabs-agent-benchmark` is not archived yet (`openspec/specs/` is empty). This change should be archived after it.
