# Tap to Automate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Express starter with the spec'd "Tap to Automate" Next.js app (NFC entry → agent conversation → blueprint reveal) plus a real n8n Agent workflow on YOUR-INSTANCE.app.n8n.cloud.

**Architecture:** Single-page client flow at `/tap` driven by a state machine (entry → conversation → blueprint), talking to one server route `/api/agent` that delegates to an adapter chosen by `N8N_MODE` (mock | demo | real). Mock/demo adapters are deterministic and run with no external services; the real adapter POSTs to an n8n webhook that fronts an AI Agent returning the structured `AgentResponse` contract. Session state lives client-side (sessionStorage) — no database.

**Tech Stack:** Next.js (current stable, App Router), TypeScript, Tailwind CSS, Zod, Vitest. n8n cloud (YOUR-INSTANCE) Webhook + AI Agent + Respond to Webhook.

**Spec:** `prompts/BUILD_SPEC.md`

## Global Constraints

- Browser must never receive n8n/Anthropic keys, webhook secrets, or private n8n URLs.
- No database; session/local state only for V1.
- Keep dependencies restrained (no UI kit; Tailwind + hand-rolled components).
- Estimates always labeled as estimates; never fabricate measured savings.
- Demo mode is deterministic but never displays "mock/fake" to the audience.
- Visual direction: premium, minimal, dark/light adaptive, subtle motion, no gimmicky AI imagery.
- Local git milestones only — never push. Nested git repo inside this folder for clean history.
- "BUILD THIS FOR ME" produces a workflow *specification request* only; never creates/activates workflows.
- n8n side: use only documented interfaces (production webhook URL); generated/derived workflows stay drafts.

---

### Task 1: Milestone 01-scaffold — Next.js project + repo hygiene

**Files:**
- Create: nested git repo (`git init`) in project root
- Create: Next.js scaffold (package.json, tsconfig.json, next.config.ts, postcss.config.mjs, app/layout.tsx, app/globals.css)
- Move: `prompts/agent-instructions.md` → superseded by `n8n/agent-instructions.md` (Task 8)
- Delete: `server.js`, `public/app.js`, `public/index.html`, `public/styles.css` (legacy starter; preserved in git history via initial commit)
- Create: `.env.example` (PORT-free, Next-style), `.gitignore`

**Steps:**
- [ ] Commit the legacy starter as-is (`chore: snapshot legacy express starter`)
- [ ] Scaffold Next.js via `create-next-app` in scratchpad, copy into repo
- [ ] `.env.example` with `N8N_MODE=demo`, `N8N_WEBHOOK_URL=`, `N8N_WEBHOOK_SECRET=`, `NEXT_PUBLIC_APP_NAME=Tap to Automate`
- [ ] `npm install`, `npm run build` passes
- [ ] Commit `feat: 01-scaffold`

### Task 2: Data contract + validation (lib/n8n/types.ts)

**Files:**
- Create: `lib/n8n/types.ts`
- Test: `tests/types.test.ts`

**Interfaces (produced, used by every later task):**
```ts
export type Complexity = "beginner" | "intermediate" | "advanced";
export interface QuickReply { label: string; value: string }
export interface AutomationStep { title: string; description: string; kind: "deterministic" | "ai" | "human" }
export interface IntegrationRecommendation { name: string; role: string }
export interface AutomationBlueprint {
  name: string; problem: string; trigger: string;
  inputs: string[]; steps: AutomationStep[];
  integrations: IntegrationRecommendation[]; exceptions: string[];
  outputs: string[]; complexity: Complexity;
  difficulty: "easy" | "moderate" | "hard";
  estimatedHoursSavedPerWeek: number | null; assumptions: string[];
}
export interface AgentResponse {
  status: "question" | "blueprint";
  message: string;
  quickReplies?: QuickReply[];
  blueprint?: AutomationBlueprint;
}
export interface DiscoverySession { sessionId: string; cardId: string; source?: string; campaign?: string }
export interface AgentTurn { role: "user" | "agent"; content: string }
export interface AgentRequest { session: DiscoverySession; history: AgentTurn[]; message: string }
```
- Zod schemas: `agentResponseSchema`, `agentRequestSchema` mirroring the above; `parseAgentResponse(raw: unknown): AgentResponse` throws `AgentContractError` on mismatch.

**Steps:**
- [ ] Write failing tests: valid question response parses; valid blueprint parses; missing blueprint on status=blueprint rejects; junk rejects
- [ ] Implement schemas
- [ ] Tests pass; commit `feat: agent data contract + zod validation`

### Task 3: Mock + demo adapters

**Files:**
- Create: `lib/n8n/adapter.ts` (interface + `getAdapter()` factory reading `N8N_MODE`)
- Create: `lib/n8n/mock-adapter.ts` (deterministic engine + 3 demo scenarios)
- Create: `lib/n8n/scenarios.ts` (scenario scripts: gmail-to-sheet, friday-invoices, website-leads-crm; each = matcher keywords, 2–3 scripted questions w/ quick replies, full blueprint)
- Test: `tests/mock-adapter.test.ts`

**Interfaces:**
- Produces: `interface AgentAdapter { send(req: AgentRequest): Promise<AgentResponse> }`, `getAdapter(): AgentAdapter`
- Demo behavior: scenario matched on first user message keywords; question count driven by script; generic fallback asks trigger→destination→volume then emits templated blueprint. Deterministic: same inputs → same outputs.

**Steps:**
- [ ] Failing tests: first gmail-ish message → status question with quick replies; after scripted answers → status blueprint with ≥4 steps incl. one `ai` and one `human` step; unknown topic → generic fallback still reaches blueprint by turn 4
- [ ] Implement; tests pass
- [ ] Commit `feat: deterministic mock/demo adapters with 3 scenarios`

### Task 4: API routes

**Files:**
- Create: `app/api/agent/route.ts` (POST: zod-validate body as AgentRequest-lite, cap message 2000 chars, call adapter, on adapter/contract error return 502 with safe `{error}`; naive in-memory rate-limit extension point `lib/rate-limit.ts`)
- Create: `app/api/lead/route.ts` (POST: {sessionId, cardId, firstName, email, blueprintName}; zod email validation; real mode forwards to n8n lead webhook if configured else logs server-side; always returns `{ok:true}` on valid input)
- Test: `tests/api-agent.test.ts` (call route handler directly with `Request` objects)

**Steps:**
- [ ] Failing tests: valid request → 200 AgentResponse; short/missing message → 400; malformed adapter output → 502
- [ ] Implement; tests pass; commit `feat: agent + lead API routes`

### Task 5: Milestone 02-nfc-entry — Screen 1

**Files:**
- Create: `app/tap/page.tsx` (server component reading searchParams card/utm_source/utm_campaign) + `app/tap/TapExperience.tsx` (client flow shell)
- Create: `components/NfcPulse.tsx` (subtle NFC ripple motif, CSS-only animation)
- Create: `lib/session.ts` (`createSession(cardId, source, campaign)` → crypto.randomUUID, persisted to sessionStorage)
- Modify: `app/page.tsx` (redirect `/?card=` → `/tap`, else marketing-lite landing linking to /tap)
- Modify: `app/layout.tsx`, `app/globals.css` (fonts, dark/light tokens)

**Screen copy (verbatim from spec):** headline `TAP TO AUTOMATE`, secondary `What's one thing you hate doing repeatedly?`, support `Tell my n8n Agent what wastes your time. It will design an automation for you.`, CTA `AUTOMATE IT →`.

**Steps:**
- [ ] Implement entry screen, mobile-first, missing-card fallback (defaults to DEMO card, shows subtle badge)
- [ ] Verify responsive at 390px + desktop; commit `feat: 02-nfc-entry`

### Task 6: Milestone 03-agent-conversation — Screen 2

**Files:**
- Create: `components/Conversation.tsx` (thread, typing indicator, quick replies, free-text composer)
- Modify: `app/tap/TapExperience.tsx` (state machine: `entry → chatting → revealing → revealed`; history kept client-side, full history sent each request so server stays stateless)

**Steps:**
- [ ] Wire to `/api/agent`; graceful error bubble w/ retry on network failure
- [ ] Verify 2-question demo path on mobile viewport; commit `feat: 03-agent-conversation`

### Task 7: Milestone 04-blueprint-reveal — Screen 3 + impact + lead

**Files:**
- Create: `components/BlueprintReveal.tsx` (dramatic transition, sections 1–12 from spec)
- Create: `components/WorkflowDiagram.tsx` (vertical node diagram from `steps[]`, branch for exceptions; step kind → visual treatment: deterministic/ai/human)
- Create: `components/ImpactCard.tsx` (ESTIMATED IMPACT, hrs/week labeled "estimate", complexity, stack line)
- Create: `components/LeadForm.tsx` (SEND THIS AUTOMATION TO ME → /api/lead; COPY BLUEPRINT → clipboard markdown; BUILD THIS FOR ME → confirmation dialog that records a spec request only)
- Create: `lib/blueprint-markdown.ts` (blueprint → shareable markdown)

**Steps:**
- [ ] Implement, reveal animation (fade/slide, prefers-reduced-motion respected)
- [ ] Verify all 3 demo scenarios render diagrams cleanly on mobile; commit `feat: 04-blueprint-reveal`

### Task 8: Milestone 05-n8n-adapter — real adapter + agent docs

**Files:**
- Create: `lib/n8n/webhook-adapter.ts` (POST AgentRequest to `N8N_WEBHOOK_URL` w/ `x-webhook-secret`; 20s timeout; parse via `parseAgentResponse`)
- Create: `n8n/agent-instructions.md` (full discovery-consultant system prompt: goals 1–10 from spec, deterministic-vs-AI principle, strict JSON output contract w/ examples)
- Test: `tests/webhook-adapter.test.ts` (fetch mocked: happy path, non-200, malformed JSON)

**Steps:**
- [ ] Failing tests → implement → pass; commit `feat: 05-n8n-adapter`

### Task 9: n8n workflow on YOUR-INSTANCE.app.n8n.cloud

**Nodes:** Webhook (POST /tap-to-automate) → Code "Validate + Shape" (secret check, build prompt context from history) → AI Agent (Anthropic chat model; system prompt = n8n/agent-instructions.md; JSON output) → Code "Enforce Contract" (parse/repair to AgentResponse) → Respond to Webhook. Separate branch or workflow for lead capture → Google Sheets (cred `H4qSGVWQzoc7hfJj`).

**Steps:**
- [ ] Invoke n8n-mcp skills (mcp-tools-expert, workflow-patterns, n8n-agents) before building
- [ ] Check anthropic-compatible credential on your n8n instance; fall back to HTTP Request + httpHeaderAuth cred `844eRQJ7eTYfOCMJ` if no native anthropicApi cred
- [ ] Create workflow via MCP, validate, test with sample payload; leave inactive until user flips it (draft-first rule)
- [ ] Document webhook URL + secret setup in docs/n8n-setup.md

### Task 10: Milestone 06-demo-mode + 07-production-ready — docs, tests, polish

**Files:**
- Create: `docs/architecture.md`, `docs/n8n-setup.md`, `docs/nfc-programming.md`, `docs/deployment.md`, `docs/presentation-runbook.md`
- Rewrite: `README.md`
- Modify: `.env.example` final

**Steps:**
- [ ] Full test suite green; `npm run build` green; lint green
- [ ] Manual pass: missing card, valid card, 3 scenarios, malformed-response path (force via test env), lead validation, 390px viewport
- [ ] Commits `feat: 06-demo-mode`, `chore: 07-production-ready`

## Self-Review

- Spec coverage: screens 1–3 (T5–7), impact (T7), lead/share (T7), architecture+adapter boundary (T1–4,8), agent design doc (T8), security (T4 validation, T7 confirm-only build-for-me, env hygiene T1), NFC params + QR fallback documented (T10 nfc-programming.md), demo mode (T3), milestones/git (each task), docs (T10), testing list (T2–4,8,10), completion definition mapped. ✓
- Types consistent: `AgentResponse`/`AgentRequest` defined once in Task 2, consumed by 3,4,8. ✓
