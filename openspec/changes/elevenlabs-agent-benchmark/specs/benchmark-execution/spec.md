## ADDED Requirements

### Requirement: Provision agents per variant
The system SHALL ensure an ElevenLabs agent exists for each variant/scenario combination, creating or updating it through the ElevenLabs Agents API with the variant's LLM, TTS model, voice and the scenario's prompt, first message and language. Provisioned agents MUST be tagged or named so the app can reuse and clean them up.

#### Scenario: Reuse existing agent
- **WHEN** a run starts for a variant/scenario whose agent already exists with identical configuration
- **THEN** the system reuses that agent without creating a new one

#### Scenario: Configuration changed
- **WHEN** the variant configuration changed since the agent was provisioned
- **THEN** the system updates the agent configuration before executing the run

### Requirement: Execute simulated text runs
The system SHALL execute runs using the ElevenLabs simulate-conversation API, passing the scenario's simulated-user definition and turn limit, and SHALL store the returned transcript and analysis.

#### Scenario: Successful simulated run
- **WHEN** a pending run is executed in simulated mode
- **THEN** the system stores the full transcript, marks the run `completed` and triggers metric collection

#### Scenario: API error with retry
- **WHEN** the ElevenLabs API returns a 429 or 5xx error
- **THEN** the system retries with exponential backoff up to 3 times and marks the run `failed` with the error message if all retries fail

### Requirement: Execute live voice runs
The system SHALL support live voice runs in the browser using the ElevenLabs Agents SDK, obtaining a signed URL or conversation token from the server so the API key is never exposed to the client, and SHALL record the resulting conversation ID for metric collection.

#### Scenario: Start live session
- **WHEN** the user starts a live run for a variant
- **THEN** the server returns a short-lived session credential and the browser connects to the agent with microphone audio

#### Scenario: End live session
- **WHEN** the live session ends
- **THEN** the system stores the conversation ID, fetches the conversation details from ElevenLabs and marks the run `completed`

### Requirement: Concurrency and progress tracking
The system SHALL execute simulated runs through a queue with a configurable concurrency limit (default 2) and SHALL expose per-run status (`pending`, `running`, `completed`, `failed`, `cancelled`) and overall benchmark progress.

#### Scenario: Progress update
- **WHEN** runs complete during a benchmark
- **THEN** the benchmark view updates the completed/total counter without a full page reload

#### Scenario: Cancel benchmark
- **WHEN** the user cancels a running benchmark
- **THEN** pending runs are marked `cancelled` and no new runs start

### Requirement: Latency metrics collection
The system SHALL record, per run, total duration, number of turns, and per-turn latency metrics reported by ElevenLabs (LLM time-to-first-byte, TTS time-to-first-byte) when available, plus client-measured wall-clock time per request.

#### Scenario: Latency stored
- **WHEN** a run completes and ElevenLabs returns per-turn metrics
- **THEN** the system stores per-turn latencies and computes mean and p95 latency for the run
