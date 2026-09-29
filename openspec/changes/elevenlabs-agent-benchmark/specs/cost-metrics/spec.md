## ADDED Requirements

### Requirement: Collect usage from ElevenLabs
The system SHALL fetch conversation details from ElevenLabs for each completed run and store reported cost (credits), call duration, and LLM usage (input/output tokens, LLM charge) when present.

#### Scenario: Usage stored
- **WHEN** conversation details are fetched for a completed run
- **THEN** the system stores credits consumed, duration in seconds and LLM token counts

#### Scenario: Usage not reported
- **WHEN** ElevenLabs does not report cost for a run (e.g. simulated runs)
- **THEN** the system marks the cost as `estimated` and computes it from the pricing table

### Requirement: Configurable pricing table
The system SHALL maintain an editable pricing table containing USD per credit, agent cost per minute by plan, and LLM prices per million input/output tokens per model, with a last-updated date.

#### Scenario: Update pricing
- **WHEN** the user edits the price of an LLM
- **THEN** subsequent cost computations and re-computations use the new price

### Requirement: Normalized cost per minute
The system SHALL compute for each run: total cost in USD, cost per minute of conversation, cost per agent turn, and the split between voice/agent cost and LLM cost.

#### Scenario: Cost per minute computed
- **WHEN** a run lasted 90 seconds and cost 0.15 USD in total
- **THEN** the system reports a cost per minute of 0.10 USD

#### Scenario: Zero-duration run
- **WHEN** a run has a duration of 0 seconds
- **THEN** the system reports cost per minute as not applicable instead of dividing by zero

### Requirement: Aggregate cost per variant
The system SHALL aggregate cost metrics per variant and scenario (mean, min, max, standard deviation across repetitions).

#### Scenario: Aggregation across repetitions
- **WHEN** a variant has 3 completed runs for a scenario
- **THEN** the system shows the mean, min and max cost per minute for that variant and scenario
