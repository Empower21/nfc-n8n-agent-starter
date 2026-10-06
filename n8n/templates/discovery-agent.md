Turn "I hate doing this task" into a structured n8n automation blueprint. A Claude agent asks a few focused questions, then returns clean JSON your frontend can render.

## Who's it for

Automation consultants, agencies and ops teams qualifying leads through a website chat, a QR code or an NFC card at an event.

## How it works

1. A webhook receives the visitor's latest message and the conversation so far.
2. A Claude AI Agent asks one focused question per turn about the trigger, inputs, destination, business rules and exceptions.
3. Once it can design confidently, it returns a structured blueprint: steps labelled deterministic, AI or human, the integrations involved, complexity, and an estimate of hours saved per week.
4. A Structured Output Parser with a fixer model repairs malformed JSON, and a Code node guarantees every response matches the same contract, so your frontend never breaks.

## Setup

Takes about 10 minutes.

1. Add an Anthropic credential to both chat model nodes.
2. On the webhook, create a Header Auth credential (for example `x-webhook-secret`).
3. Click **Execute workflow** to test with the pinned sample message.
4. From your frontend, POST `{ "message": "...", "history": [] }` and send each agent reply back in `history` as `{ "role": "agent", "content": "..." }`.

## Requirements

- Anthropic API key
- A frontend or tool that can call a webhook

## How to customize the workflow

Change `maxFollowUps` in the Configuration node, edit the system message to match your services, or swap Claude for another chat model.
