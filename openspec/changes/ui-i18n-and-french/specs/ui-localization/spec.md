## ADDED Requirements

### Requirement: Supported UI languages
The system SHALL render its user interface in English (`en`), Spanish (`es`) or French (`fr`). Every user-visible string rendered by pages and client components MUST come from a per-language dictionary. The Spanish and French dictionaries MUST define every key of the English dictionary, so that no string falls back silently.

#### Scenario: Interface in French
- **WHEN** the UI language is `fr` and the user opens the variants page
- **THEN** the page title, form labels, buttons, empty state and navigation are shown in French

#### Scenario: Dictionaries are complete
- **WHEN** the project is type-checked or tested
- **THEN** a Spanish or French dictionary missing a key defined in English fails the check

### Requirement: Choose and persist the UI language
The system SHALL provide a language switcher in the navigation bar listing English, Español and Français, each in its own language. Selecting a language MUST re-render the current page in that language without losing the current route, and the choice MUST persist across reloads and new sessions in the same browser.

#### Scenario: Switch language
- **WHEN** the user on `/scenarios` selects "Español" in the switcher
- **THEN** the scenarios page is shown in Spanish and the URL stays `/scenarios`

#### Scenario: Choice persists
- **WHEN** the user has selected French and later reloads the app
- **THEN** the interface is shown in French

### Requirement: Default UI language
When the user has not chosen a language, the system SHALL use the best match between the browser's `Accept-Language` preferences and the supported languages, and English when there is no match. The document's `lang` attribute MUST match the active UI language.

#### Scenario: Spanish browser
- **WHEN** a first-time visitor's browser sends `Accept-Language: es-MX,es;q=0.9,en;q=0.8`
- **THEN** the interface is shown in Spanish and `<html lang="es">` is set

#### Scenario: Unsupported browser language
- **WHEN** a first-time visitor's browser sends `Accept-Language: de-DE`
- **THEN** the interface is shown in English

### Requirement: Localized formatting
The system SHALL format dates and decimal numbers using the active UI language's conventions. Server- and client-rendered output MUST be identical for the same language, so that hydration doesn't mismatch. Currency values MUST remain in USD.

#### Scenario: French number and date format
- **WHEN** the UI language is `fr` and a run's complexity score is 30.7, created on 29 September 2026
- **THEN** the score is shown as "30,7" and the date uses French month names

### Requirement: Localized guided tours and metrics reference
The guided tours and the Metrics reference page SHALL be shown in the active UI language. A tour completed in one language MUST count as completed in every language.

#### Scenario: Tour in Spanish
- **WHEN** the UI language is `es` and the home tour starts
- **THEN** every step's title, body and button labels are in Spanish

### Requirement: UI language is independent of scenario language
Changing the UI language MUST NOT change any scenario's language, template content, generated drafts, agent configuration or stored transcripts. Model-facing text (the LLM judge rubric and the scenario writer instruction) MUST remain unchanged regardless of UI language.

#### Scenario: French UI with English scenario
- **WHEN** the UI language is `fr` and the user runs a benchmark with an English scenario
- **THEN** the agent is configured in English and the transcript and judge rubric are unaffected
