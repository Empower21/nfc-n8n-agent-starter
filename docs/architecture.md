# Architecture

## The concept

```text
NFC = physical context
Web application = experience
n8n Agent = intelligence
n8n tools = actions
```

The card carries only a URL. Everything intelligent happens server-side.

## Flow

```text
NFC tap → /tap?card=N8N001&utm_source=nfc&utm_campaign=tap-to-automate
  → Screen 1: entry (task input)
  → Screen 2: agent conversation (2–5 follow-ups)
  → Screen 3: blueprint reveal (diagram, impact, lead capture)
```

## Client

- Next.js App Router, single client flow in `components/TapExperience.tsx`
  with a three-phase state machine: `entry → chat → reveal`.
- Session (`lib/session.ts`): UUID created client-side, persisted in
  `sessionStorage`, keyed to the card ID. No server session, no database.
- The full conversation history is sent with every request, so the server
  is completely stateless and a refresh cannot corrupt a conversation.

## Server boundary

The browser only ever talks to two routes:

- `POST /api/agent` — validates the body with zod (`agentRequestSchema`),
  rate-limits by IP (`lib/rate-limit.ts`), delegates to the adapter, and
  validates the adapter's answer (`parseAgentResponse`) before returning.
  Malformed agent output becomes a clean 502, never raw model text.
- `POST /api/lead` — validates lead fields, forwards to the n8n lead
  webhook when configured, logs (masked) otherwise.

No n8n URL, secret, or API key ever reaches the client bundle.

## Adapter layer (`lib/n8n/`)

```text
adapter.ts          AgentAdapter interface + getAdapter() factory (N8N_MODE)
types.ts            zod schemas + TS types: the single data contract
mock-adapter.ts     deterministic engine (mock & demo modes)
scenarios.ts        3 scripted demo scenarios + generic fallback
webhook-adapter.ts  real mode: POST to the n8n production webhook
```

`N8N_MODE`:

- `mock` / `demo` — deterministic engine, zero external calls.
- `real` — `WebhookAgentAdapter` POSTs the `AgentRequest` to
  `N8N_WEBHOOK_URL` with the `x-webhook-secret` header, 20s timeout, and
  parses the response against the same schema the demo engine honors.

## Data contract

`AgentResponse` is the pivot type (see `lib/n8n/types.ts`):

```json
{
  "status": "question | blueprint",
  "message": "...",
  "quickReplies": [{ "label": "...", "value": "..." }],
  "blueprint": { "name": "...", "steps": [{ "kind": "deterministic|ai|human" }], "...": "..." }
}
```

Every step carries a `kind` so the UI can visually distinguish
deterministic workflow logic, AI reasoning, and human approval — the core
teaching point of the demo.

## n8n side

Workflow `Tap to Automate — Discovery Agent` (ID `YOUR_WORKFLOW_ID` on
YOUR-INSTANCE.app.n8n.cloud), two webhook paths:

```text
POST /webhook/tap-to-automate
  Webhook → Validate Request (Code: secret + shape conversation)
          → Authorized? (IF) ──false→ Respond 403
          → AI Agent (Anthropic Sonnet + Structured Output Parser w/ autoFix via Haiku)
          → Enforce Contract (Code: final shape guard)
          → Respond to Webhook

POST /webhook/tap-to-automate-lead
  Webhook → Format Lead (Code) → Gmail send → Respond {ok:true}
```

Defense in depth: three validation layers (parser autoFix in n8n → Enforce
Contract code node → zod in the app) mean a misbehaving model degrades to a
polite recovery question, never a broken screen.

## Testing

Vitest, node environment (`tests/`): contract schemas, mock adapter
conversations (all 3 scenarios + generic fallback + determinism), webhook
adapter (mocked fetch), API route handlers (validation, rate limit, error
mapping). UI verified by browser QA at 390×844.
