## MODIFIED Requirements

### Requirement: Generate scenario prompt and first message
The system SHALL let the user generate a draft agent system prompt and first message from a short free-text description, a target language (`en`, `es` or `fr`) and an optional tone, using an LLM called through the Vercel AI SDK. The generated system prompt MUST be written for a spoken voice agent (no markdown, short turns, explicit role, goal and guardrails) and MUST be in the requested language. The first message MUST be a single spoken opening line in the same language.

#### Scenario: Generate from description
- **WHEN** the user enters "front desk of a dental clinic that books cleanings" with language `en` and requests generation
- **THEN** the system returns a draft containing a non-empty system prompt and a non-empty first message, both in English, without saving anything

#### Scenario: Spanish generation
- **WHEN** the user requests generation with language `es`
- **THEN** the system prompt and first message in the draft are written in Spanish

#### Scenario: French generation
- **WHEN** the user requests generation with language `fr`
- **THEN** the system prompt and first message in the draft are written in French

#### Scenario: Description required
- **WHEN** the user requests generation with an empty or shorter-than-10-character description
- **THEN** the system rejects the request with a field error on the description and does not call the LLM

### Requirement: Built-in scenario templates
The system SHALL provide built-in scenario templates for at least "Customer service", "Restaurant booking" and "Medical appointment", each available in English, Spanish and French. Each template MUST contain every field required to save a valid scenario (name, system prompt, first message, language, user mode, simulated-user content and max turns). Templates are read-only and not stored as scenarios.

#### Scenario: List templates
- **WHEN** the user opens the template picker on the scenarios page
- **THEN** the system lists the three templates with a short description, and each offers English, Spanish and French

#### Scenario: Template prefills form
- **WHEN** the user selects the "Restaurant booking" template in Spanish
- **THEN** the scenario form is filled with the template's Spanish name, system prompt, first message, user mode, simulated-user content and max turns, and nothing is saved until the user submits

#### Scenario: French template
- **WHEN** the user selects the "Medical appointment" template in French
- **THEN** the form is filled with French content whose guardrails still restrict the agent to scheduling and redirect emergencies to emergency services

#### Scenario: Templates are valid scenarios
- **WHEN** any built-in template is submitted without edits
- **THEN** it passes scenario validation and is saved as a new scenario

#### Scenario: Template overwrite confirmation
- **WHEN** the user selects a template while the form has unsaved content
- **THEN** the system asks for confirmation before replacing the form contents
