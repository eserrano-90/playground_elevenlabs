## ADDED Requirements

### Requirement: Comparison table
The system SHALL display, per benchmark, a table with one row per variant showing LLM, TTS model, voice, mean latency, p95 latency, composite complexity score, judge scores, cost per minute and cost per conversation, with sortable columns.

#### Scenario: Sort by cost
- **WHEN** the user clicks the cost-per-minute column header
- **THEN** rows are ordered by cost per minute ascending, and clicking again orders descending

#### Scenario: Filter by scenario
- **WHEN** the user selects a scenario filter
- **THEN** the table shows aggregates only for runs of that scenario

### Requirement: Comparison charts
The system SHALL provide charts comparing variants: cost per minute vs. complexity scatter plot, latency bar chart, and a per-metric bar chart selectable by the user.

#### Scenario: Cost vs complexity chart
- **WHEN** the user opens the charts tab of a completed benchmark
- **THEN** a scatter plot shows each variant positioned by cost per minute (x) and composite complexity (y), with a tooltip identifying the variant

### Requirement: Run detail view
The system SHALL show, for each run, the full transcript with per-turn latency, the computed metrics, judge rationale, cost breakdown and, for live runs, the audio playback when available.

#### Scenario: Open run detail
- **WHEN** the user clicks a run
- **THEN** the system shows the transcript, metrics and cost breakdown for that run

### Requirement: Side-by-side response comparison
The system SHALL allow selecting two or more variants and viewing their responses to the same scenario turn by turn in adjacent columns.

#### Scenario: Compare two variants
- **WHEN** the user selects two variants for a scenario
- **THEN** the system shows their transcripts aligned by turn index side by side

### Requirement: Export results
The system SHALL export benchmark results (per-run and aggregated) as CSV and JSON.

#### Scenario: Export CSV
- **WHEN** the user clicks "Export CSV" on a benchmark
- **THEN** the browser downloads a CSV with one row per run including all metrics and cost fields
