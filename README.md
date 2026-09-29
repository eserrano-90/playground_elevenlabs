# ElevenLabs Agent Benchmark

Local web app to benchmark ElevenLabs Agents across **LLM × TTS model × voice** combinations. For each variant it measures
response complexity, latency, and cost per minute, then lets you compare, rank, and export the results.

> ⚠️ **Cost warning.** Benchmarks run against your own ElevenLabs account and **consume real credits** (agent minutes plus
> LLM usage). Every run is billed. The app shows an estimate before each benchmark starts, and it caps runs per benchmark
> (`BENCH_MAX_RUNS`, default 50). The estimate uses the pricing table in **Settings**, so check those values against
> [elevenlabs.io/pricing](https://elevenlabs.io/pricing) and your plan first. If the LLM judge is enabled, it adds usage
> on your judge provider.

## Stack

Next.js (App Router) · TypeScript · SQLite + Drizzle · Tailwind + shadcn/ui · TanStack Table · Recharts · `@elevenlabs/react` · Vercel AI SDK (judge).

## Setup

Requirements: Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env.local   # then fill in ELEVENLABS_API_KEY
pnpm db:migrate && pnpm db:seed
pnpm dev                     # http://localhost:3000
```

`db:seed` loads the pricing table and the list of ElevenLabs-supported LLMs from `src/db/pricing.seed.json`. It is safe to re-run.

### Environment variables

| Variable             | Required | Default           | Description                                                                 |
| -------------------- | -------- | ----------------- | --------------------------------------------------------------------------- |
| `ELEVENLABS_API_KEY` | yes      | —                 | Server-side only; never sent to the browser. The server fails fast without it. |
| `DATABASE_PATH`      | no       | `./data/bench.db` | SQLite file.                                                                |
| `JUDGE_PROVIDER`     | no       | —                 | `anthropic` or `openai`. Leave it empty to disable judge scoring.            |
| `JUDGE_API_KEY`      | no       | —                 | API key for the judge provider.                                             |
| `JUDGE_MODEL`        | no       | —                 | Judge model ID. Pick a model that is **not** under test, to avoid self-preference bias. |
| `ASSIST_MODEL`       | no       | `JUDGE_MODEL`     | Model for "Generate with AI" on the scenarios page. Uses the judge provider and key. |
| `BENCH_CONCURRENCY`  | no       | `2`               | Parallel runs (1–10). Keep it low to avoid 429s.                            |
| `BENCH_MAX_RUNS`     | no       | `50`              | Hard cap on runs per benchmark.                                             |

The judge only runs when all three `JUDGE_*` variables are set. Scenario generation needs the same three (and uses `ASSIST_MODEL` instead of `JUDGE_MODEL` when set), so both features share one provider key.

## Running a benchmark

1. **Variants** (`/variants`): create one variant per combination of LLM, TTS model, voice, and optional voice settings.
   The selectors load from the ElevenLabs API, and you can type IDs manually if the API is unavailable. Use **Duplicate**
   to make near-identical variants quickly.
2. **Scenarios** (`/scenarios`): define the system prompt, first message, language (`en`/`es`), max turns, and the
   simulated user. The simulated user is either a **persona** (a free-form goal) or **scripted** turns. Scripted turns
   are fairer for comparisons.
3. **New benchmark** (`/benchmarks/new`): pick the variants, scenarios, and repetitions, and toggle the judge.
   The matrix is `variants × scenarios × repetitions`. Review the cost estimate, then confirm.
4. **Results** (`/benchmarks/[id]`): progress updates every 2 s. Tabs:
   - aggregate table: mean, min–max, and σ per variant, plus `reported`/`estimated` cost badges
   - charts: cost/min vs complexity, latency mean/p95, and any metric you choose
   - side-by-side transcripts
   - per-run list
   Filter by scenario, or export runs or aggregates as CSV or JSON. You can **Cancel** a running benchmark. **Retry**
   re-queues failed runs, and **Re-analyze** recomputes metrics from the stored transcripts.
5. **Run detail** (`/runs/[id]`): transcript with per-turn latency and tokens, cost breakdown, complexity metrics, judge
   rationale, and audio when available.
6. **Live** (`/live`): talk to a variant through your microphone (WebRTC) to capture real audio latency and voice
   perception. The server issues a short-lived conversation token, so the API key never reaches the browser.

Agents are created per (variant, scenario) with a `bench-` name prefix and reused while their config hash is unchanged.
To delete them from your ElevenLabs account, go to **Settings → Clean up bench agents**.

### Execution modes

- **Simulated** (default): uses ElevenLabs `simulate-conversation`, a text-only simulation that is repeatable and needs
  no microphone. It produces no TTS audio, so duration and voice cost are **estimated** (see below) and badged as such.
- **Live**: a real voice session in the browser. Duration, latency, and cost come from ElevenLabs conversation metadata.

## Metrics

### Latency

Per-turn LLM and TTS time-to-first-byte come from the conversation metadata when ElevenLabs reports them. Otherwise the
app uses wall-clock timing. Each run reports the **mean** and **p95**.

### Response complexity

All deterministic metrics are computed on the agent turns only.

| Metric                 | Definition                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Words / response       | Mean word count per agent turn.                                                                 |
| Avg sentence length    | Words ÷ sentences across all agent text.                                                        |
| Readability            | `en`: Flesch-Kincaid grade level. `es`: Fernández-Huerta ease (0–100, higher = easier). Chosen by scenario language. |
| Lexical diversity      | MATTR (moving-average type-token ratio, window 50), which reduces length bias compared with raw TTR. |
| Total agent chars      | Sum of characters across agent turns. Also drives duration estimation.                          |
| Judge (optional)       | An LLM rates relevance, depth, coherence, and adherence (1–5) at temperature 0, with the JSON validated by Zod. |

Runs with no agent output get a `no_output` flag and null metrics.

### Composite score (0–100)

Each metric is linearly scaled to 0–1 over a **fixed reference range** and clamped. The scaled values are combined as a
weighted mean and multiplied by 100. Fixed ranges keep scores stable while a benchmark is still running, and make them
comparable across benchmarks. The weights and ranges live in `src/lib/analysis/composite.ts`.

| Component           | Weight | Range (→ 0 … 1)                                     |
| ------------------- | ------ | --------------------------------------------------- |
| Words / response    | 0.20   | 5 … 150                                             |
| Avg sentence length | 0.20   | 5 … 30                                              |
| Readability         | 0.25   | FK grade 0 … 16 · Fernández-Huerta ease 100 … 0 (inverted) |
| Lexical diversity   | 0.15   | 0.30 … 0.90                                         |
| Judge               | 0.20   | 1 … 5 (mean of depth and coherence)                 |

When the judge doesn't run, its weight is dropped and the other weights are renormalized. A higher score means more
complex or richer responses. It does **not** mean better: a support agent may want a *lower* score.

### Cost

1. **Reported:** the cost is taken from the ElevenLabs conversation metadata (credits → USD via *USD per credit*,
   plus any reported LLM charge).
2. **Estimated:** used when nothing is reported. The formula is `duration × agent $/min (plan) + LLM tokens × model $/M tokens`.
   For simulated runs, duration is estimated as `agent chars ÷ speech rate (chars/s)` for the TTS model.

Derived values are **total USD**, **cost/min** (`total ÷ (duration_s / 60)`, or N/A when duration is 0), **cost/turn**,
and the voice vs LLM split. Aggregates per variant × scenario show the mean, min, max, and standard deviation.

All prices can be edited in **Settings** (`/settings`). After changing prices, click **Re-analyze** on a benchmark to
recompute its costs.

## Development

```bash
pnpm test        # Vitest: analysis, cost, matrix expansion, runner (mocked ElevenLabs)
pnpm typecheck
pnpm lint
pnpm db:generate # after editing src/db/schema.ts
```

Layout:

```
src/app/            pages + REST handlers (app/api)
src/lib/elevenlabs/ typed fetch + Zod adapter, provisioning, simulate, conversation fetch
src/lib/queue/      p-queue runner with p-retry backoff
src/lib/analysis/   text metrics, readability, judge, composite
src/lib/cost/       pricing + cost computation
src/db/             Drizzle schema, migrations, seed
```
