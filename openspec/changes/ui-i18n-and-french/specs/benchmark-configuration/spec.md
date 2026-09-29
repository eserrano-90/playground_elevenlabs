## MODIFIED Requirements

### Requirement: Manage test scenarios
The system SHALL allow users to create, edit and delete test scenarios. Each scenario MUST include a name, an agent system prompt, a first message, a language, and a simulated-user definition (persona prompt or scripted list of user turns) plus a maximum number of turns. The language MUST be one of English (`en`), Spanish (`es`) or French (`fr`), and it is used as the ElevenLabs agent language.

#### Scenario: Create a scripted scenario
- **WHEN** the user creates a scenario with a system prompt and three scripted user turns
- **THEN** the system stores the scenario and it becomes selectable for benchmarks

#### Scenario: French scenario
- **WHEN** the user creates a scenario with language `fr`
- **THEN** the system stores it, and agents provisioned for it are created with language `fr`

#### Scenario: Unsupported language rejected
- **WHEN** a scenario is submitted with language `de`
- **THEN** the system rejects it with a validation error on the language field

## ADDED Requirements

### Requirement: Warn about language and TTS model compatibility
The system SHALL warn, when a benchmark is being configured, about every selected variant/scenario pair where the scenario language is not English and the variant's TTS model supports English only. The warning MUST name the affected variants and scenarios, and it MUST NOT block creating the benchmark.

#### Scenario: English-only model with French scenario
- **WHEN** the user selects a variant using an English-only TTS model and a French scenario
- **THEN** the new-benchmark form shows a warning naming that variant and scenario before the user starts the benchmark

#### Scenario: Compatible selection
- **WHEN** every selected variant uses a multilingual TTS model or every selected scenario is English
- **THEN** no compatibility warning is shown
