# TAP TO AUTOMATE — BUILD SPECIFICATION

## Mission

Build a polished mobile-first web application called **Tap to Automate**.

This application is activated from an NFC card and demonstrates n8n's new Agents functionality.

The physical NFC card does **not** contain intelligence. It contains only a URL.

Example:

```text
https://DOMAIN/tap?card=N8N001
```

The application must make this concept obvious:

```text
NFC = physical context
Web application = experience
n8n Agent = intelligence
n8n tools = actions
```

The core question presented to the user is:

> What's one thing you hate doing repeatedly?

The user describes a repetitive task.

The n8n Automation Discovery Agent conversationally determines what they are trying to automate, asks only the minimum number of useful follow-up questions, and produces a practical automation blueprint.

Do not turn this into a static questionnaire.

The value of the demonstration is that the Agent decides what it needs to ask.

---

## Product Experience

### Screen 1 — NFC Entry

URL:

```text
/tap?card=N8N001
```

Read and retain:

- card
- source
- campaign if present

Generate a session ID.

Present a premium animated landing experience.

Primary headline:

> TAP TO AUTOMATE

Secondary headline:

> What's one thing you hate doing repeatedly?

Supporting copy:

> Tell my n8n Agent what wastes your time. It will design an automation for you.

Primary free-text input.

CTA:

> AUTOMATE IT →

Include subtle NFC visual language.

Do not make this look like a generic chatbot.

Design it as a premium technology product/demo.

---

### Screen 2 — Agent Discovery

The user's initial task becomes the first message to the Agent.

Display the conversation elegantly.

The Agent should ask contextual questions.

Example:

**User:**  
Every morning I manually copy customer enquiries from email into Excel.

**Agent:**  
How do those enquiries usually arrive?

Possible quick replies:

- Gmail
- Outlook
- Form
- Multiple sources
- Other

The Agent may provide quick replies when useful but must support free text.

The Agent should decide when enough information has been collected.

Target approximately 2–5 follow-up questions.

Never force five questions if two are sufficient.

---

### Screen 3 — Automation Reveal

When enough information is available, transition dramatically from conversation mode into an automation blueprint.

Display:

1. Automation name
2. Problem summary
3. Trigger
4. Inputs
5. Processing/reasoning steps
6. Recommended n8n nodes/integrations
7. Exception handling
8. Output/actions
9. Complexity
10. Estimated implementation difficulty
11. Estimated time saved
12. Assumptions

Create a beautiful workflow diagram.

Example:

```text
Gmail
  ↓
New Email
  ↓
Extract Information
  ↓
AI Agent
 ↙       ↘
Valid    Exception
 ↓          ↓
Sheets    Alert
 ↓
Confirmation
```

Make this visually compelling enough for a live technology presentation and YouTube video.

---

## Impact Section

Display:

> ESTIMATED IMPACT

Example:

> 5 hrs/week potentially saved

Complexity:

> Beginner

Recommended stack:

> Gmail • n8n Agent • Google Sheets • Gmail

Clearly label estimates as estimates.

Never fabricate measured savings.

---

## Lead / Share Experience

Offer:

> SEND THIS AUTOMATION TO ME

Fields:

- first name
- email

Also include:

> COPY BLUEPRINT

and later:

> BUILD THIS FOR ME

The initial version of **BUILD THIS FOR ME** should **not** automatically activate or deploy workflows.

It may create or request a workflow specification only.

---

## Architecture

Use:

- Next.js current stable release
- TypeScript
- App Router
- Tailwind CSS
- accessible components
- server-side API routes
- Zod or equivalent schema validation

Keep dependencies restrained.

Do not add a database unless actually necessary.

For V1 use session/local state where appropriate.

---

## n8n Integration Boundary

Create a server-side abstraction.

The browser must **never** receive:

- n8n API keys
- webhook secrets
- Anthropic/OpenAI keys
- credentials
- internal n8n URLs that should remain private

Implement:

```text
lib/n8n/adapter.ts
lib/n8n/types.ts
lib/n8n/mock-adapter.ts
```

Support environment configuration.

Suggested concepts:

```text
N8N_MODE=mock
N8N_AGENT_URL=
N8N_WEBHOOK_URL=
N8N_API_KEY=
```

Do **not** invent undocumented n8n endpoints.

The application must operate fully in mock mode before a real n8n connection is configured.

When implementing real n8n connectivity, only use officially documented interfaces.

Keep runtime integration replaceable because n8n Agents are currently a Preview capability.

---

## Data Contract

Use structured responses.

Create types similar to:

```text
AgentMessage
AgentQuestion
QuickReply
AutomationBlueprint
AutomationStep
AutomationImpact
IntegrationRecommendation
```

Blueprint shape should approximately include:

```json
{
  "status": "question | blueprint",
  "message": "...",
  "quickReplies": [],
  "blueprint": {
    "name": "...",
    "problem": "...",
    "trigger": "...",
    "steps": [],
    "integrations": [],
    "exceptions": [],
    "complexity": "beginner | intermediate | advanced",
    "estimatedHoursSavedPerWeek": null,
    "assumptions": []
  }
}
```

Validate every Agent response.

Handle malformed Agent output gracefully.

---

## n8n Agent Design Documentation

Create:

```text
n8n/agent-instructions.md
```

The Agent should behave as a senior automation discovery consultant.

Its job is **not** merely to chat.

Its job is to:

1. understand the repetitive process
2. identify trigger
3. identify inputs
4. identify destination/output
5. identify business rules
6. identify exceptions
7. determine whether AI reasoning is actually necessary
8. recommend an n8n architecture
9. stop asking questions once sufficient information exists
10. produce a structured blueprint

Important principle:

> Do not use AI where deterministic workflow logic is better.

The Agent should explicitly distinguish between:

- deterministic workflow steps
- AI reasoning steps
- human approval steps

It should favor the simplest reliable architecture.

---

## Security

Never commit secrets.

Create:

```text
.env.example
```

but never create a populated `.env` file containing real credentials.

Validate API inputs.

Rate-limit or design a clear rate-limiting extension point.

Do not render raw model HTML.

Do not automatically execute destructive actions.

**Build this for me** must require explicit confirmation before any future workflow creation or activation.

Generated workflows must initially be drafts only.

---

## NFC

Document how the NFC card should eventually be programmed.

Canonical URL:

```text
https://DOMAIN/tap?card=N8N001&utm_source=nfc&utm_campaign=tap-to-automate
```

The application should recognize:

- card
- utm_source
- utm_campaign

Include QR-code fallback capability in the architecture, but do not make QR the primary interaction.

---

## Visual Direction

Premium.

Minimal.

Dark/light adaptive.

Think:

> physical object → digital intelligence

Use subtle motion.

Avoid excessive gradients, glassmorphism, emojis or gimmicky AI imagery.

The experience should feel credible in:

- enterprise presentation
- technology conference
- YouTube video
- n8n Ambassador demonstration

The workflow reveal should be the visual climax.

---

## Demonstration Mode

Create a `DEMO_MODE`.

It must allow deterministic demonstration without depending on an external service.

Include three demo scenarios:

1. Gmail enquiries copied to spreadsheet
2. invoices reconciled manually every Friday
3. website leads manually entered into CRM

Demo mode must behave realistically.

Do not display "fake" or "mock" prominently to the audience.

Internally document that it is deterministic demo data.

---

## Development Requirements

Before implementation:

1. Inspect repository.
2. Create an architecture plan.
3. Identify assumptions.
4. Show proposed file structure.
5. Do not start major implementation until the plan is coherent.

Then implement incrementally.

After each phase:

- run TypeScript checks
- lint
- run tests
- verify mobile responsiveness
- summarize changes

Use Git milestones but **do not** push anything remotely.

Create logical local commits so the project can later be reconstructed for YouTube demonstrations.

Recommended milestones:

```text
01-scaffold
02-nfc-entry
03-agent-conversation
04-blueprint-reveal
05-n8n-adapter
06-demo-mode
07-production-ready
```

Preserve a clean Git history.

This is important because later videos will recreate selected development stages.

---

## Documentation Required

Create:

```text
README.md

docs/architecture.md
docs/n8n-setup.md
docs/nfc-programming.md
docs/deployment.md
docs/presentation-runbook.md
```

The presentation runbook should support a 15-minute live demonstration.

---

## Testing

Test at minimum:

- missing card ID
- valid card ID
- session creation
- initial message
- follow-up message
- blueprint response
- malformed Agent response
- Agent/network failure
- mobile viewport
- lead form validation

Provide graceful user-facing error states.

---

## Completion Definition

V1 is complete when:

1. NFC-style URL can open the application.
2. The user can describe a repetitive task.
3. A conversational Agent discovery flow works.
4. The system can determine when to stop questioning.
5. A structured automation blueprint is displayed.
6. The workflow visualization looks presentation-ready.
7. Lead/share functionality works at least locally.
8. Mock/demo mode works reliably.
9. Real n8n integration has a clean documented adapter.
10. No credentials are exposed.
11. Tests pass.
12. README and demonstration documentation are complete.

Do not overengineer V1.

> Build the smallest architecture that can become spectacular.
