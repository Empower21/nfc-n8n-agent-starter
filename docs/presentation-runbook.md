# Presentation Runbook — 15-minute live demo

Audience takeaway: *a dumb plastic card + a web page + an n8n Agent =
a personal automation consultant.*

## Before you walk on stage

- [ ] App deployed; phone connected to reliable network (hotspot backup).
- [ ] Decide the mode:
  - **`N8N_MODE=demo`** — deterministic, zero external dependencies.
    Use this when the network or live-model risk is unacceptable.
  - **`N8N_MODE=real`** — live n8n Agent (workflow must be Active).
    More impressive; keep demo mode as the instant fallback (it's an env
    var flip + redeploy, or run two deployments and switch URLs).
- [ ] NFC card written with the production URL; tested on YOUR phone.
- [ ] Phone screen mirroring working (AirPlay / Vysor / cable).
- [ ] n8n canvas open in a browser tab (for the workflow tour).
- [ ] Do one full rehearsal tap 10 minutes before.

## Script

**Minute 0–2 — The hook.**
Hold up the card. "This card has no chip smarter than a bus ticket. It
holds one URL. Everything intelligent about what you're about to see
lives in n8n." Tap the phone. The entry screen appears on the big screen.

**Minute 2–4 — The question.**
Read the headline aloud: "What's one thing you hate doing repeatedly?"
Ask the audience for a real answer, or use the reliable seed:
*"Every morning I manually copy customer enquiries from email into
Excel."* Type it. Hit AUTOMATE IT.

**Minute 4–7 — The discovery.**
Narrate what's happening: "The Agent is deciding what it needs to know —
nobody scripted these questions." Answer the 2 follow-ups (quick replies
keep this fast on stage). Point out that it stopped asking when it had
enough — "it decides when it's done, not a form."

**Minute 7–11 — The reveal (the climax).**
Let the blueprint animate in. Walk the diagram top to bottom and land the
key teaching point on the step badges:
- grey = deterministic workflow steps ("no AI where rules are better")
- red = the one AI reasoning step ("AI only where text is messy")
- amber = human approval ("uncertain data never writes blind")
Point at ESTIMATED IMPACT: "5 hours a week — and notice it says
*estimate*. We don't fabricate measurements."

**Minute 11–13 — Behind the curtain.**
Switch to the n8n canvas. Trace: Webhook → Validate → AI Agent (show the
system prompt) → Structured Output → Respond. One sentence on the
contract: "The agent must answer in a strict JSON shape; three layers of
validation mean a misbehaving model degrades to a polite question, never
a broken screen."

**Minute 13–15 — The close.**
Back to the phone. Tap "Send this automation to me", enter a name/email —
"and yes, this lead capture is itself an n8n workflow; the card just
emailed me a lead." CTA: "One card, one tap, one agent. What would you
automate?"

## Reliable demo seeds (demo mode scenarios)

1. "Every morning I manually copy customer enquiries from email into Excel."
2. "We reconcile invoices manually every Friday."
3. "Website leads get typed into our CRM by hand."

Anything else falls back to a generic 3-question discovery — still works,
less tailored. In live mode, everything is fair game.

## Failure playbook

| Symptom | Move |
|---|---|
| Venue network dies | Demo mode needs no network beyond the page itself — switch to the demo-mode deployment |
| Agent slow/erroring in real mode | The UI shows a retry bubble; tap retry once, else switch to demo deployment |
| NFC won't read | QR fallback card, or open the URL from browser history |
| Projector dies | Keep narrating on the phone — the experience is mobile-first anyway |
