## Why

ElevenLabs Agents can be backed by many LLMs (GPT, Claude, Gemini, etc.), TTS models (Flash, Turbo, Multilingual, v3) and voices, but there is no easy way to compare how each combination behaves on the same conversation: how complex/rich the answers are, how fast they respond, and what they actually cost per minute. We need a repeatable benchmark to choose agent configurations on evidence instead of guesswork.

## What Changes

- New web app (greenfield repo) to define, run and compare benchmarks of ElevenLabs agents.
- Benchmark configuration: build a matrix of **LLM × TTS model × voice** variants plus a set of reusable test scenarios (system prompt, first message, simulated-user script/goal).
- Benchmark execution:
  - Automated text runs via the ElevenLabs *simulate conversation* API (no microphone needed, repeatable).
  - Optional live voice runs in the browser via the ElevenLabs Agents SDK with per-session overrides, to measure real audio latency and voice quality.
- Metrics collection per run: transcript, turn count, duration, latency (LLM TTFB, TTS TTFB, end-to-end), credits/cost reported by ElevenLabs, LLM token usage.
- Response complexity analysis: deterministic text metrics (words/turn, sentence length, readability grade, vocabulary diversity) and an optional LLM-as-judge score (relevance, depth, coherence).
- Cost normalization: convert credits/LLM usage into **cost per minute** and **cost per conversation** using a configurable pricing table.
- Comparison dashboard: tables and charts to compare variants side by side, filter by scenario, rank by cost/latency/complexity, and export results (CSV/JSON).
- Persistence of configurations, runs and results in a local database.

## Capabilities

### New Capabilities
- `benchmark-configuration`: Manage agent variants (LLM, TTS model, voice, parameters) and test scenarios; generate the benchmark matrix.
- `benchmark-execution`: Run benchmarks against ElevenLabs agents (simulated text runs and live voice runs), with concurrency control, retries and run status tracking.
- `response-complexity-analysis`: Compute complexity metrics of agent responses, deterministic and LLM-judge based.
- `cost-metrics`: Collect usage/cost from ElevenLabs and compute normalized cost per minute and per conversation for each variant.
- `results-dashboard`: Visualize, compare, rank and export benchmark results across variants and scenarios.

### Modified Capabilities
<!-- None: greenfield project, no existing specs. -->

## Impact

- **New code**: entire application (Next.js frontend + API routes, DB schema, ElevenLabs client, analysis module).
- **External APIs**: ElevenLabs Agents Platform (`/v1/convai/agents`, `/v1/convai/agents/{id}/simulate-conversation`, `/v1/convai/conversations/{id}`, `/v1/voices`, `/v1/models`, signed URL / conversation token for live sessions); optional LLM provider for judge scoring.
- **Dependencies**: `@elevenlabs/elevenlabs-js`, `@elevenlabs/react`, SQLite + ORM (Drizzle), charting library, Zod.
- **Secrets**: `ELEVENLABS_API_KEY` (and optional judge API key) kept server-side only.
- **Cost**: running benchmarks consumes ElevenLabs credits and LLM usage on the user's account; the app must surface estimated cost before running.
