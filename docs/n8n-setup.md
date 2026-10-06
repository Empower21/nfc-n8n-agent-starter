# n8n Setup

The workflow already exists on `YOUR-INSTANCE.app.n8n.cloud`:

> **Tap to Automate — Discovery Agent** — workflow ID `YOUR_WORKFLOW_ID`

It was created inactive (draft-first policy). To go live:

## 1. Activate the workflow

Open the workflow in n8n and flip the **Active** toggle. That publishes
two production webhooks:

```text
https://YOUR-INSTANCE.app.n8n.cloud/webhook/tap-to-automate
https://YOUR-INSTANCE.app.n8n.cloud/webhook/tap-to-automate-lead
```

## 2. Configure the app

In `.env` (never commit it):

```text
N8N_MODE=real
N8N_WEBHOOK_URL=https://YOUR-INSTANCE.app.n8n.cloud/webhook/tap-to-automate
N8N_LEAD_WEBHOOK_URL=https://YOUR-INSTANCE.app.n8n.cloud/webhook/tap-to-automate-lead
N8N_WEBHOOK_SECRET=<your-webhook-secret>
```

The secret must match `SHARED_SECRET` in the workflow's **Validate
Request** code node. Rotate both together (pick something stronger than
the demo value before any public deployment).

## 3. Smoke test

```bash
curl -s -X POST https://YOUR-INSTANCE.app.n8n.cloud/webhook/tap-to-automate \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <your-webhook-secret>" \
  -d '{"session":{"sessionId":"smoke-1","cardId":"N8N001"},"history":[],"message":"Every morning I copy enquiries from email into Excel."}'
```

Expected: a JSON object with `"status": "question"` and a contextual
follow-up. Without the secret header you should get HTTP 403.

## Workflow anatomy

| Node | Purpose |
|---|---|
| Discovery Webhook | POST `/tap-to-automate`, responds via Respond node |
| Validate Request | Shared-secret check; flattens history into a transcript; counts follow-ups already asked |
| Authorized? | IF gate → Reject (403) on bad secret |
| Discovery Agent | AI Agent node; system prompt from `n8n/agent-instructions.md`; hard cap at 5 follow-ups enforced in the prompt via the follow-up counter |
| Anthropic Chat Model | `claude-sonnet-4-5` via credential "Anthropic account" (`YOUR_ANTHROPIC_CREDENTIAL_ID`) |
| Structured Output | Manual JSON schema matching `lib/n8n/types.ts`; autoFix on |
| Fixer Model | `claude-haiku-4-5` repairs malformed JSON against the schema |
| Enforce Contract | Code guard: anything invalid becomes a polite recovery question |
| Respond | Returns the first item as the webhook response |
| Lead Webhook → Format Lead → Email Lead → Respond Lead | Lead + build-request notifications to you@example.com via Gmail credential `YOUR_GMAIL_CREDENTIAL_ID` |

## Changing the agent's behavior

Edit the system message in the **Discovery Agent** node. The canonical
source is `n8n/agent-instructions.md` in this repo — edit there first,
then paste, so the repo stays the source of truth. If you change the JSON
contract, update all three layers: the parser schema in n8n, the system
message, and `lib/n8n/types.ts`.

## Cost note

Each conversation turn is one Sonnet call (plus a rare Haiku call when
JSON needs repair). A 4-turn discovery ≈ 5 model calls. Keep `demo` mode
for rehearsals; use `real` only when you want live intelligence.
