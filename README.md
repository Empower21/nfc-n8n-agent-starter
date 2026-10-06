# Tap to Automate

An NFC card opens a URL. The URL opens a premium mobile experience. An
n8n Agent turns "the task I hate doing" into a practical automation
blueprint — live, in conversation.

```text
NFC = physical context
Web application = experience
n8n Agent = intelligence
n8n tools = actions
```

## Quick start

```bash
npm install
cp .env.example .env   # defaults to demo mode — no external services needed
npm run dev
```

Open <http://localhost:3000/tap?card=N8N001>.

Try: *"Every morning I manually copy customer enquiries from email into
Excel."* — answer the two follow-ups, watch the blueprint reveal.

## Modes

| `N8N_MODE` | What happens |
|---|---|
| `demo` (default) | Deterministic discovery engine with three polished scenarios + a generic fallback. Zero external calls. Built for live stages. |
| `mock` | Same engine, intended for development. |
| `real` | Conversations go to the n8n Agent workflow on n8n cloud. See `docs/n8n-setup.md`. |

## Project map

```text
app/tap/                 The experience (entry → conversation → reveal)
app/api/agent/           Conversation endpoint (zod-validated, rate-limited)
app/api/lead/            Lead + build-request capture
components/              TapExperience, Conversation, BlueprintReveal, WorkflowDiagram, …
lib/n8n/                 The adapter boundary: types (contract), mock/demo engine, webhook adapter
n8n/agent-instructions.md  System prompt for the n8n AI Agent (source of truth)
docs/                    architecture, n8n-setup, nfc-programming, deployment, presentation-runbook
tests/                   26 vitest tests (contract, adapters, API routes)
```

## Commands

```bash
npm run dev         # dev server
npm run test        # vitest suite
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # production build
```

## The n8n workflow

`Tap to Automate — Discovery Agent` (ID `YOUR_WORKFLOW_ID`) on
YOUR-INSTANCE.app.n8n.cloud: Webhook → validate + secret check → AI Agent
(Claude Sonnet, structured output with auto-fix) → contract guard →
respond. A second webhook path emails leads via Gmail. Created inactive —
activation and smoke-test steps in `docs/n8n-setup.md`.

## Security posture

- The browser never sees n8n URLs, webhook secrets, or API keys.
- Every input and every agent response is schema-validated server-side.
- "Build this for me" records a specification request only — nothing is
  ever created or activated automatically.
- Impact numbers are always labeled estimates.

## Docs

- `docs/architecture.md` — how it fits together
- `docs/n8n-setup.md` — going live with the real agent
- `docs/nfc-programming.md` — writing the physical cards (+ QR fallback)
- `docs/deployment.md` — Vercel / Node hosting
- `docs/presentation-runbook.md` — the 15-minute stage script
