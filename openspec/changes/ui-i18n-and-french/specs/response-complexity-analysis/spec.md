## MODIFIED Requirements

### Requirement: Deterministic complexity metrics
The system SHALL compute, for the agent turns of each completed run: average words per response, average sentence length, readability grade (Flesch-Kincaid for English, Fernández-Huerta for Spanish, Kandel–Moles for French), lexical diversity (type-token ratio), and total agent characters. The readability formula MUST be chosen by the scenario language and stored with the value.

#### Scenario: Metrics computed on completion
- **WHEN** a run transitions to `completed`
- **THEN** the system computes and stores all deterministic complexity metrics for that run

#### Scenario: Empty agent output
- **WHEN** a run has no agent turns with text
- **THEN** the system stores null metrics and flags the run as `no_output`

#### Scenario: French readability
- **WHEN** a run of a French scenario completes
- **THEN** its readability is computed with Kandel–Moles using French syllable counting, and the stored formula is `kandel-moles`

### Requirement: Composite complexity score
The system SHALL compute a normalized composite complexity score (0–100) per run from the deterministic metrics and, when available, judge scores, using documented weights. Reading-ease formulas, where a higher value means easier text (Fernández-Huerta, Kandel–Moles), MUST be inverted so that a higher composite always means more complex.

#### Scenario: Composite score available
- **WHEN** deterministic metrics exist for a run
- **THEN** the system stores a composite score between 0 and 100

#### Scenario: Easier French text scores lower
- **WHEN** two French runs have identical metrics except that the first has a higher Kandel–Moles ease
- **THEN** the first run has the lower composite score
