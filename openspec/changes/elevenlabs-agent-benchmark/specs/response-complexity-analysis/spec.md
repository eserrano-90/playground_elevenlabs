## ADDED Requirements

### Requirement: Deterministic complexity metrics
The system SHALL compute, for the agent turns of each completed run: average words per response, average sentence length, readability grade (Flesch-Kincaid for English, Fernández-Huerta for Spanish), lexical diversity (type-token ratio), and total agent characters.

#### Scenario: Metrics computed on completion
- **WHEN** a run transitions to `completed`
- **THEN** the system computes and stores all deterministic complexity metrics for that run

#### Scenario: Empty agent output
- **WHEN** a run has no agent turns with text
- **THEN** the system stores null metrics and flags the run as `no_output`

### Requirement: LLM-as-judge scoring
The system SHALL optionally score each run's transcript with a configurable judge LLM using a fixed rubric (relevance, depth, coherence, instruction adherence), each on a 1–5 scale, and SHALL store the scores with the judge model identifier and rationale.

#### Scenario: Judge enabled
- **WHEN** judge scoring is enabled and a run completes
- **THEN** the system stores rubric scores between 1 and 5 and a short rationale for each criterion

#### Scenario: Judge disabled or unconfigured
- **WHEN** no judge API key is configured
- **THEN** the system skips judge scoring and the dashboard shows judge columns as unavailable

### Requirement: Composite complexity score
The system SHALL compute a normalized composite complexity score (0–100) per run from the deterministic metrics and, when available, judge scores, using documented weights.

#### Scenario: Composite score available
- **WHEN** deterministic metrics exist for a run
- **THEN** the system stores a composite score between 0 and 100

### Requirement: Re-analysis
The system SHALL allow re-running analysis on existing runs without re-executing the conversation.

#### Scenario: Recompute after rubric change
- **WHEN** the user triggers re-analysis on a benchmark
- **THEN** the system recomputes metrics for all completed runs using stored transcripts
