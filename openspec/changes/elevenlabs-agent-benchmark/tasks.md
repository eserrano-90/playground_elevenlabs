## 1. Project Setup

- [x] 1.1 Scaffold Next.js (App Router, TypeScript, pnpm) with Tailwind and shadcn/ui
- [x] 1.2 Add dependencies: `@elevenlabs/elevenlabs-js`, `@elevenlabs/react`, `drizzle-orm`, `better-sqlite3`, `drizzle-kit`, `zod`, `p-queue`, `p-retry`, `@tanstack/react-table`, `recharts`, `ai`
- [x] 1.3 Configure Vitest, ESLint, Prettier and `.env.example` (`ELEVENLABS_API_KEY`, `JUDGE_PROVIDER`, `JUDGE_API_KEY`, `JUDGE_MODEL`)
- [x] 1.4 Add server-only env loader with Zod validation (fails fast without `ELEVENLABS_API_KEY`)

## 2. Database

- [x] 2.1 Define Drizzle schema: `variants`, `scenarios`, `benchmarks`, `runs`, `run_turns`, `run_metrics`, `judge_scores`, `pricing`, `agents_cache`, `llm_options`
- [x] 2.2 Generate and apply initial migration; add `db:migrate` and `db:seed` scripts
- [x] 2.3 Seed pricing table (`pricing.seed.json`) and ElevenLabs-supported LLM list
- [x] 2.4 On server boot, mark stale `running` runs as `failed`

## 3. ElevenLabs Adapter

- [x] 3.1 Create typed client wrapper with Zod `safeParse` of responses and raw JSON persistence
- [x] 3.2 Implement `listVoices` and `listModels` (TTS) endpoints
- [x] 3.3 Implement agent provisioning with config hash → `agents_cache` (create / reuse / patch, `bench-` prefix)
- [x] 3.4 Implement `simulateConversation` (persona and scripted modes, turn limit)
- [x] 3.5 Implement `getConversation` to fetch transcript, per-turn metrics and metadata (duration, cost, LLM usage)
- [x] 3.6 Implement signed URL / conversation token route for live sessions
- [x] 3.7 Implement "cleanup bench agents" action
- [x] 3.8 Unit tests with mocked HTTP for adapter parsing and retry classification (429/5xx)

## 4. Benchmark Configuration

- [x] 4.1 API routes + Zod schemas for variants CRUD (incl. duplicate)
- [x] 4.2 Variants UI: form with LLM / TTS model / voice selectors (with voice preview) and manual-entry fallback
- [x] 4.3 API routes + UI for scenarios CRUD (prompt, first message, language, persona or scripted turns, max turns)
- [x] 4.4 Benchmark creation: select variants, scenarios, repetitions; expand matrix into pending runs; enforce max-runs cap
- [x] 4.5 Pre-run cost estimate display and confirmation step
- [x] 4.6 Tests for matrix expansion (3×2×2 = 12) and validation errors

## 5. Benchmark Execution

- [x] 5.1 Implement runner with `p-queue` (configurable concurrency, default 2) and `p-retry` backoff (3 attempts)
- [x] 5.2 Simulated run pipeline: provision agent → simulate → persist transcript/turns → trigger metrics
- [x] 5.3 Status endpoint and polling UI with progress counter and per-run status
- [x] 5.4 Cancel benchmark (pending → `cancelled`, stop dispatching)
- [x] 5.5 Latency collection: per-turn LLM/TTS TTFB, wall-clock timing, mean and p95 per run
- [x] 5.6 Live run page using `@elevenlabs/react` (`useConversation`) with server-issued credential; store conversation ID on end and fetch details
- [x] 5.7 Integration test of runner with mocked adapter (success, retry, failure, cancel)

## 6. Response Complexity Analysis

- [x] 6.1 Implement text utilities: tokenization, sentence splitting, syllable counting (en/es)
- [x] 6.2 Implement metrics: words/response, avg sentence length, MATTR lexical diversity, total agent chars
- [x] 6.3 Implement readability: Flesch-Kincaid (en) and Fernández-Huerta (es) selected by scenario language
- [x] 6.4 Handle empty agent output (`no_output` flag, null metrics)
- [x] 6.5 Implement optional LLM judge (rubric: relevance, depth, coherence, adherence; 1–5; JSON validated by Zod; temperature 0); skip when unconfigured
- [x] 6.6 Implement composite score (0–100, fixed-range normalization, documented weights)
- [x] 6.7 Re-analysis endpoint recomputing metrics from stored transcripts
- [x] 6.8 Unit tests for metrics and readability with fixed fixtures

## 7. Cost Metrics

- [x] 7.1 Pricing settings UI + API (USD/credit, agent $/min by plan, LLM $/M tokens in/out, `updated_at`)
- [x] 7.2 Cost computation: reported cost first, fallback estimate, `source` flag (`reported` | `estimated`)
- [x] 7.3 Duration estimation for simulated runs from agent chars and per-TTS-model speech rate
- [x] 7.4 Derived metrics: total USD, cost/min (null on zero duration), cost/turn, voice vs LLM split
- [x] 7.5 Aggregation per variant × scenario: mean, min, max, std dev
- [x] 7.6 Unit tests (90 s / 0.15 USD → 0.10 USD/min; zero duration → N/A; pricing change recompute)

## 8. Results Dashboard

- [x] 8.1 Benchmark results table (TanStack Table): sortable columns, scenario filter, reported/estimated badges
- [x] 8.2 Charts: cost/min vs complexity scatter, latency bars, selectable metric bars (Recharts)
- [x] 8.3 Run detail page: transcript with per-turn latency, metrics, judge rationale, cost breakdown, audio if available
- [x] 8.4 Side-by-side comparison of 2+ variants aligned by turn index
- [x] 8.5 Export per-run and aggregated results as CSV and JSON

## 9. Documentation & Verification

- [x] 9.1 README: setup, env vars, cost warning, how to run a benchmark, metric definitions and composite weights
- [ ] 9.2 End-to-end smoke test: create 2 variants + 1 scenario, run simulated benchmark against real API with 1 repetition, verify dashboard and export
