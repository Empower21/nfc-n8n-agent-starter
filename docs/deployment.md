# Deployment

## Vercel (recommended)

```bash
npm i -g vercel   # if not installed
vercel            # preview
vercel --prod     # production
```

Set environment variables in the Vercel project (Settings → Environment
Variables), never in the repo:

| Variable | Demo day | Live agent |
|---|---|---|
| `N8N_MODE` | `demo` | `real` |
| `N8N_WEBHOOK_URL` | — | `https://YOUR-INSTANCE.app.n8n.cloud/webhook/tap-to-automate` |
| `N8N_LEAD_WEBHOOK_URL` | — | `https://YOUR-INSTANCE.app.n8n.cloud/webhook/tap-to-automate-lead` |
| `N8N_WEBHOOK_SECRET` | — | must match the workflow's Validate Request node |

`demo` mode needs zero configuration — safe default for a stage.

## Any Node host

```bash
npm ci
npm run build
npm run start   # PORT env respected by next start -p
```

## Pre-flight checklist

- `npm run test` — 26 tests green
- `npm run build` — clean production build
- Visit `/tap?card=N8N001` on a phone — entry, conversation, reveal
- If `N8N_MODE=real`: run the curl smoke test in `docs/n8n-setup.md`
- Confirm `.env` is not committed (`git status`)

## Rate limiting

`lib/rate-limit.ts` is a per-process in-memory limiter (30 req/min per IP
on `/api/agent`, 10 on `/api/lead`). On serverless this resets per
instance — acceptable for a demo. For sustained public traffic, swap the
`check()` implementation for a shared store (Upstash Redis) behind the
same signature.

## NFC cards point at production

Cards are permanent once locked. Deploy to the final domain first, test
the full flow on that domain, then write and lock cards
(`docs/nfc-programming.md`).
