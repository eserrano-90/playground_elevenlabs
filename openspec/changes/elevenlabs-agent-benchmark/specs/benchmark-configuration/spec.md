## ADDED Requirements

### Requirement: Manage agent variants
The system SHALL allow users to create, edit, duplicate and delete agent variants. Each variant MUST define an LLM identifier, a TTS model identifier, a voice ID, and optional parameters (LLM temperature, max tokens, voice stability, similarity boost, speed).

#### Scenario: Create a variant
- **WHEN** the user submits a variant with LLM `gpt-4o-mini`, TTS model `eleven_flash_v2_5` and a valid voice ID
- **THEN** the system persists the variant and shows it in the variants list

#### Scenario: Reject incomplete variant
- **WHEN** the user submits a variant without an LLM, TTS model or voice
- **THEN** the system rejects it and displays a validation error for the missing field

### Requirement: Load available options from ElevenLabs
The system SHALL populate the LLM, TTS model and voice selectors from the ElevenLabs API (voices and models endpoints) and a maintained list of LLMs supported by ElevenLabs Agents.

#### Scenario: Voices listed from account
- **WHEN** the user opens the variant form
- **THEN** the voice selector lists the voices available in the configured ElevenLabs account, including name and preview URL

#### Scenario: API unavailable
- **WHEN** the ElevenLabs API request for voices or models fails
- **THEN** the system shows an error and allows entering the identifier manually

### Requirement: Manage test scenarios
The system SHALL allow users to create, edit and delete test scenarios. Each scenario MUST include a name, an agent system prompt, a first message, a language, and a simulated-user definition (persona prompt or scripted list of user turns) plus a maximum number of turns.

#### Scenario: Create a scripted scenario
- **WHEN** the user creates a scenario with a system prompt and three scripted user turns
- **THEN** the system stores the scenario and it becomes selectable for benchmarks

### Requirement: Build benchmark matrix
The system SHALL let users create a benchmark by selecting one or more variants and one or more scenarios plus a repetition count, and SHALL generate one run per (variant, scenario, repetition) combination.

#### Scenario: Matrix expansion
- **WHEN** the user selects 3 variants, 2 scenarios and 2 repetitions
- **THEN** the system creates a benchmark containing 12 pending runs

#### Scenario: Cost estimate before start
- **WHEN** the benchmark matrix is generated
- **THEN** the system displays an estimated total cost based on the pricing table and scenario max turns before the user confirms execution
