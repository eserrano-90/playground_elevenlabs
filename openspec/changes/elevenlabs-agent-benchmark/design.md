## Context

Greenfield repository (`playground_eleven_labs`), no existing code or specs. Goal: a local-first web app to benchmark ElevenLabs Agents across LLM × TTS model × voice combinations, measuring response complexity, latency and cost per minute. Single user / small team, runs on a developer machine; API keys belong to the user's ElevenLabs account. Benchmarks consume real credits, so cost visibility and control matter.

Relevant ElevenLabs Agents Platform surfaces:
- `POST/PATCH /v1/convai/agents` — agent config: `conversation_config.agent.prompt.llm`, `prompt.prompt`, `first_message`, `language`, `conversation_config.tts.model_id`, `voice_id`, voice settings.
- `POST /v1/convai/agents/{agent_id}/simulate-conversation` — text simulation with a simulated user (`simulation_specification`), returns transcript + analysis. Repeatable and needs no audio.
- `GET /v1/convai/conversations/{id}` — transcript, per-turn metrics, `metadata` (duration, cost/charging, LLM usage).
- Signed URL / conversation token endpoints — for browser live sessions via `@elevenlabs/react`.
- `GET /v1/voices`, `GET /v1/models` — option lists.

## Goals / Non-Goals

**Goals:**
- Repeatable, automated benchmark runs (simulated mode) across a variant matrix.
- Optional live voice runs to capture real audio latency and voice perception.
- Comparable metrics: complexity (deterministic + judge), latency (mean/p95), cost per minute/conversation.
- Transparent cost: estimate before, actual/estimated after, editable pricing.
- Dashboard with sorting, filters, charts, side-by-side transcripts, CSV/JSON export.

**Non-Goals:**
- Multi-tenant auth, user accounts, hosted deployment.
- Automated audio quality scoring (MOS, WER on synthesized audio) — possible follow-up.
- Benchmarking non-ElevenLabs voice stacks.
- Telephony (Twilio/SIP) runs.

## Decisions

### D1. Next.js (App Router) + TypeScript, single app
Frontend and server API routes in one project; server routes hold `ELEVENLABS_API_KEY`. **Alternatives:** Vite SPA + separate Express/FastAPI backend (more moving parts); Python Streamlit (fast, but weaker for live voice SDK and custom UI). Next.js fits the official `@elevenlabs/react` SDK and keeps secrets server-side.

### D2. SQLite + Drizzle ORM
Local file DB, zero ops, typed schema and migrations. Tables: `variants`, `scenarios`, `benchmarks`, `runs`, `run_turns`, `run_metrics`, `judge_scores`, `pricing`, `agents_cache`. **Alternatives:** Postgres (overkill locally), JSON files (no querying/aggregation). Drizzle keeps a path to Postgres/libSQL later.

### D3. Agent provisioning: one agent per (variant, scenario) with config hash
Compute a hash of the effective config (LLM, TTS model, voice, voice settings, prompt, first message, language); store `hash → agent_id` in `agents_cache`. Reuse on match, `PATCH` on change. Names prefixed `bench-` for cleanup. Concurrent runs for the same (variant, scenario) share one in-flight provisioning promise to avoid duplicate agents / cache races. **Alternative:** a single agent with per-conversation overrides — overrides for LLM/TTS model are limited and must be enabled in the agent security settings; simulate-conversation may not honor all overrides. Dedicated agents give clean isolation and reproducibility. Live runs may still use overrides for voice to avoid agent sprawl if needed.

### D4. Simulated mode as primary execution path
Use `simulate-conversation` with `simulation_specification.simulated_user_config` (persona prompt) or scripted turns, and a `new_turns_limit`. Deterministic scripts give fairer comparisons than free personas; both supported. **Trade-off:** simulated runs have no TTS audio, so TTS latency/cost is absent → marked `estimated` (see D7).

### D5. In-process job queue
`p-queue` in the Next.js server with configurable concurrency (default 2), retries with exponential backoff (`p-retry`) on 429/5xx. Run state persisted in DB so a restart marks `running` runs as `failed` (resumable manually). Progress to UI via polling (`/api/benchmarks/:id/status` every 2s) — **alternative** SSE is nicer but polling is simpler and robust across dev reloads.

### D6. Complexity analysis module (pure TS)
`analysis/` module with pure functions: tokenization, sentence splitting, words/response, avg sentence length, type-token ratio (MATTR window 50 to reduce length bias), readability (Flesch-Kincaid for `en`, Fernández-Huerta for `es`, selected by scenario language). Judge: optional, via Vercel AI SDK (`ai`) so any provider works; fixed rubric prompt, JSON output validated with Zod, `temperature: 0`. Composite score (0–100) = weighted mean of metrics linearly scaled over **fixed reference ranges** and clamped (weights and ranges in `analysis/composite.ts`, documented in README and run detail); judge weight renormalized away when absent. *Revised during implementation:* min-max within a benchmark was dropped because scores shifted as runs completed and were not comparable across benchmarks. **Alternative:** only judge scoring — rejected: costly, non-deterministic; deterministic metrics give a baseline.

### D7. Cost model
Priority: (1) ElevenLabs-reported cost from conversation `metadata` (credits → USD via pricing table; LLM charge if reported); (2) estimate = duration × agent price per minute (plan) + LLM tokens × model price. Each cost row carries `source: reported | estimated`. Cost per minute = total USD / (duration_s / 60), null when duration = 0. For simulated runs without duration, estimate duration from agent characters via a configurable speech rate (chars/sec) per TTS model. Pricing stored in DB, seeded from a `pricing.seed.json` with `updated_at`.

### D8. UI stack
Tailwind + shadcn/ui for components, TanStack Table for sortable/filterable tables, Recharts for charts (scatter cost vs complexity, latency bars). Zod schemas shared between forms and API routes.

### D9. Project layout
```
src/
  app/                 # routes: /variants, /scenarios, /benchmarks, /benchmarks/[id], /runs/[id], /live, /settings
  app/api/             # REST handlers
  lib/elevenlabs/      # client wrapper, provisioning, simulate, conversation fetch
  lib/queue/           # runner, retries
  lib/analysis/        # complexity + judge
  lib/cost/            # pricing + cost computation
  db/                  # drizzle schema, migrations, seed
```

## Risks / Trade-offs

- [Simulated runs don't exercise TTS] → Label metrics by mode; offer live runs; estimate TTS cost/duration explicitly flagged `estimated`.
- [ElevenLabs API shapes change / fields missing (cost, metrics)] → Wrap in a typed adapter with Zod `safeParse`; store raw JSON response per run for later re-parsing. Implemented as a thin `fetch` + Zod adapter rather than wrapping `@elevenlabs/elevenlabs-js`, so unknown/missing fields degrade gracefully instead of throwing.
- [Credit burn from large matrices] → Pre-run estimate + confirmation, hard cap on runs per benchmark (configurable, default 50), cancel button.
- [Rate limits] → Low default concurrency, backoff retries.
- [Judge bias (same-family LLM favoring itself)] → Judge model configurable; show judge model in results; recommend a model not under test.
- [Readability formulas unreliable for short turns / non-English] → Compute on aggregated agent text per run; language-specific formula; show raw metrics alongside composite.
- [Agent sprawl in the ElevenLabs account] → `bench-` prefix + "cleanup agents" action.
- [In-process queue lost on restart] → Persisted state; stale `running` runs recovered as `failed` on boot.
- [LLM list drift] → LLM list as editable config seeded with known ElevenLabs-supported IDs; manual entry allowed.

## Migration Plan

Not applicable (greenfield). Setup: `.env.local` with `ELEVENLABS_API_KEY` (+ optional judge key), `pnpm db:migrate && pnpm db:seed`, `pnpm dev`.

## Open Questions

- Which ElevenLabs plan pricing should the default table assume (Creator/Pro/Business per-minute rates)?
- Should the judge default to a specific provider (e.g. Claude) or stay disabled until configured?
- Is audio recording retrieval for live runs required in v1, or transcript-only?
- Primary benchmark language: Spanish, English, or both?
