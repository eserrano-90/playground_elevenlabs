## ADDED Requirements

### Requirement: Generate scenario prompt and first message
The system SHALL let the user generate a draft agent system prompt and first message from a short free-text description, a target language (`en` or `es`) and an optional tone, using an LLM called through the Vercel AI SDK. The generated system prompt MUST be written for a spoken voice agent (no markdown, short turns, explicit role, goal and guardrails) and MUST be in the requested language. The first message MUST be a single spoken opening line in the same language.

#### Scenario: Generate from description
- **WHEN** the user enters "front desk of a dental clinic that books cleanings" with language `en` and requests generation
- **THEN** the system returns a draft containing a non-empty system prompt and a non-empty first message, both in English, without saving anything

#### Scenario: Spanish generation
- **WHEN** the user requests generation with language `es`
- **THEN** the system prompt and first message in the draft are written in Spanish

#### Scenario: Description required
- **WHEN** the user requests generation with an empty or shorter-than-10-character description
- **THEN** the system rejects the request with a field error on the description and does not call the LLM

### Requirement: Optionally generate simulated-user content
The system SHALL, when the user asks for it, include simulated-user content in the draft that matches the scenario's user mode: 3–6 scripted user turns in scripted mode, or a persona prompt in persona mode. The draft SHALL also suggest a scenario name.

#### Scenario: Scripted turns included
- **WHEN** the user requests generation in scripted mode with "include simulated user" enabled
- **THEN** the draft includes between 3 and 6 non-empty scripted user turns in the requested language

#### Scenario: Persona included
- **WHEN** the user requests generation in persona mode with "include simulated user" enabled
- **THEN** the draft includes a non-empty persona prompt and no scripted turns

### Requirement: Review draft before applying
The system SHALL show the generated draft in a preview before changing the form. Applying the draft SHALL only fill the form and MUST NOT save the scenario. If any target field in the form is not empty, the system MUST ask for confirmation before overwriting it.

#### Scenario: Apply to empty form
- **WHEN** the user applies a draft to a form whose prompt and first message are empty
- **THEN** the form fields are filled with the draft and the scenario is not yet saved

#### Scenario: Overwrite confirmation
- **WHEN** the user applies a draft while the system prompt field already has text
- **THEN** the system asks for confirmation and keeps the existing text if the user cancels

#### Scenario: Regenerate
- **WHEN** the user is viewing a draft and chooses to regenerate
- **THEN** the system requests a new draft with the same inputs and replaces the preview

### Requirement: Generation availability and errors
The system SHALL enable generation only when an AI provider is configured (the same provider settings as the LLM judge, with an optional model override). When not configured, the generate action MUST be disabled with an explanation of which settings are missing. Provider failures MUST be reported to the user without losing form contents.

#### Scenario: Provider not configured
- **WHEN** the judge provider settings are not configured
- **THEN** the generate action is disabled and shows which environment variables enable it, and the generate endpoint responds with an error without calling any LLM

#### Scenario: Provider error
- **WHEN** the LLM call fails or times out
- **THEN** the system shows an error message and the form contents remain unchanged

#### Scenario: Model override
- **WHEN** `ASSIST_MODEL` is set
- **THEN** generation uses that model with the judge provider and API key instead of `JUDGE_MODEL`

### Requirement: Built-in scenario templates
The system SHALL provide built-in scenario templates for at least "Customer service", "Restaurant booking" and "Medical appointment", each available in English and Spanish. Each template MUST contain every field required to save a valid scenario (name, system prompt, first message, language, user mode, simulated-user content and max turns). Templates are read-only and not stored as scenarios.

#### Scenario: List templates
- **WHEN** the user opens the template picker on the scenarios page
- **THEN** the system lists the three templates with a short description, and each offers English and Spanish

#### Scenario: Template prefills form
- **WHEN** the user selects the "Restaurant booking" template in Spanish
- **THEN** the scenario form is filled with the template's Spanish name, system prompt, first message, user mode, simulated-user content and max turns, and nothing is saved until the user submits

#### Scenario: Templates are valid scenarios
- **WHEN** any built-in template is submitted without edits
- **THEN** it passes scenario validation and is saved as a new scenario

#### Scenario: Template overwrite confirmation
- **WHEN** the user selects a template while the form has unsaved content
- **THEN** the system asks for confirmation before replacing the form contents
