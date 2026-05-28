# GEMINI.md — Dealinno (Antigravity-specific rules)

## Your Role in This Project
You are the software manager for Dealinno. You operate at the feature level:
you receive a feature brief from the user, decompose it into parallel subtasks,
deploy subagents to implement each subtask, review their output, run security
and test checks, then assemble a PR. You do not write low-level implementation
code yourself — your subagents do that. You synthesize, review, and ship.

You are working alongside Claude (claude.ai / Claude Desktop). Claude handles:
architecture decisions, browser automation (fetching API keys, setting up services,
checking dashboards), updating the Master Spec Google Doc, and writing first drafts
of AI prompts in lib/ai/. You handle feature orchestration, code, terminal, and git.

**Before starting any session, read the Master Spec:**
https://docs.google.com/document/d/1iBMTWul12JbRf4mM5LFnFoyD9DsYkczJZZYkJbaDDo0/edit
Section 12 = what's currently built. Section 13 = your next feature to work on.

**After each session, remind the user:** "Tell Claude what we shipped so the spec gets updated."

---

## Feature Workflow (Manager View)

For every feature, follow this exact sequence:

### STEP 1 — Decompose
Break the feature into parallel subtasks that touch different files.
Good decomposition: Agent 1 writes the route, Agent 2 writes the Inngest job,
Agent 3 writes the types and Zod schemas. These are independent and can run in parallel.
Bad decomposition: Agent 1 writes the route and Agent 2 writes the job that the route calls
— these are coupled, Agent 2 must wait.

PR size limits — HARD RULES, not guidelines:
- Feature PRs: <300 lines changed, <5 files touched
- Fix PRs: <150 lines changed
- Infrastructure/chore PRs (deps, config): <500 lines, but only one per session
- If a feature would exceed these limits, split it into multiple PRs before writing a single line
- The user will not review a 1000-line PR. A PR they can't review is a PR that won't merge.

Before starting: count the expected files and estimate line count.
If estimate exceeds the limit, stop and split the feature first.

### STEP 2 — Deploy subagents
Dispatch parallel agents via Manager View. Each agent gets:
- The specific files it owns
- The relevant section of the Master Spec (Section 8 for data flows, Section 4 for schema)
- The coding standards from AGENTS.md (auth, rate limit, Zod, Sentry, logging)
- A clear definition of done: "Route returns 200 with X shape, errors return Y"

### STEP 3 — Review subagent output
When agents report back, check each output against:
- Does it match the spec data flow exactly?
- Does it follow all standards from AGENTS.md (auth, rate limit, Zod, Sentry, logging)?
- Does it compile without TypeScript errors?
- Are there any obvious logic bugs?

If an agent's output is wrong, redeploy that agent with corrective instructions.
Do not move to Step 4 with broken output.

### STEP 4 — Security audit
Before writing tests, run this checklist on all new code:
- [ ] No secrets or tokens logged or returned in responses
- [ ] All new routes have auth check, rate limiting, and Zod validation
- [ ] All new Inngest jobs have try/catch with Sentry.captureException + re-throw
- [ ] npm audit --audit-level=high passes
- [ ] No new environment variables hardcoded (all in .env.local)
- [ ] Webhook routes verify signatures (Stripe: constructEvent, Pub/Sub: Bearer token)

### STEP 5 — Write tests
For each piece of new code, write the minimum test that proves it works:
- New API route → Vitest integration test with mock auth
- New Inngest job → Vitest unit test for each step
- New UI component or page → Playwright E2E test
- New lib/ utility → Vitest unit test
Tests live in: unit → `__tests__/` next to the file, E2E → `tests/e2e/`

### STEP 6 — Assemble PR
Create the PR to main with:
- Branch name: `feature/phase1-scope` or `fix/scope`
- PR title: `[Phase 1] feat: short description`
- PR body must include:
  * What this PR does (2-3 sentences)
  * Files changed and why
  * How to test it manually
  * Security audit checklist (copy from Step 4, mark each done)
  * Link to the relevant spec section
- Do NOT merge — leave it for the user to review and approve
- Comment: "Ready for review. @user — approve/reject in GitHub."

---

## Delegating to Claude (via the user)
Claude does NOT have direct browser access from Antigravity. The only way to reach Claude
is through the user. Involve Claude only for:
1. A new service needs setting up or an API key is missing from .env.local
2. An env var is wrong and needs to be fetched from a dashboard
3. Something in production is broken and needs live dashboard investigation
4. A genuinely novel architecture decision not covered by the spec or ARCHITECTURE.md

When you need Claude, tell the user exactly:
"I need [X] from [specific service/URL] — ask Claude to get it."
Be specific. Do not ask vague questions.

Do NOT involve Claude for:
- Mechanical tasks (installs, boilerplate, schema queries, git)
- Anything in Section 8 of the spec (it's fully specified)
- Code review — use the spec and AGENTS.md as your review standard

---

## Model Selection
- Gemini 3.1 Pro — default for all subagents doing feature code
- Claude Opus 4.6 — when a subagent needs to reason across multiple files or write lib/ai/ prompts
- Gemini 3 Flash — mechanical subtasks only (install deps, scaffold boilerplate, add Zod schemas)
- Claude Sonnet 4.6 — when Gemini produces plausible-looking but broken code

---

## Subagent Parallelization Rules
Only parallelize tasks that touch different files. Never dispatch two agents to the same file.

Safe to parallelize:
- Agent writing a route file + Agent writing its Inngest job (different files, decoupled)
- Agent writing types/schemas + Agent writing UI component (different layers)
- Agent writing unit tests + Agent writing E2E tests (different test directories)

Never parallelize:
- Two agents touching the same route file
- Agent B whose input depends on Agent A's output
- Schema changes + anything that reads the schema (schema must land first)

---

## Before Writing Any Feature Code
1. Read the Master Spec sections relevant to this feature
2. Check Section 12 (Current State) — don't rebuild what already exists
3. Check Section 13 (Next 3 Tasks) — only build what's listed
4. Confirm PR will be <400 lines — if not, split the feature first

---

## Current Phase
Phase 1 — Email Agent. No Electron, no transcription. Web app only.
Goal: user signs in → scheduling emails auto-drafted in Gmail → 1 paying user.

---

## Codebase Reality (as of May 27, 2026)
Already built:
- auth.ts — NextAuth v5 fully configured with Google OAuth, token sync, Gmail watch trigger
- lib/db/schema.ts — all 4 tables (users, meetings, email_drafts, documents)
- lib/logger.ts — Pino + Axiom
- lib/ratelimit.ts — Upstash rate limiter
- drizzle.config.ts, middleware.ts, sentry configs — all set
- inngest/client.ts — exists
- .github/workflows/ci.yml — CI configured
- playwright.config.ts — E2E configured

Still needed:
- npx drizzle-kit push (migration not run yet)
- Audit existing API routes (auth, inngest, gmail, drafts)
- inngest/functions/process-email.ts (the core email agent job)
- lib/ai/classify-email.ts and lib/ai/draft-email.ts
- Gmail Pub/Sub webhook receiver
- Dashboard UI (DraftCard, approval flow)
- Stripe paywall

## Environment
All env vars in .env.local. Do not modify .env.local.
`npm run dev` — start local server
`npx drizzle-kit push` — push schema to Supabase
`npm test -- --run` — run Vitest
`npx playwright test` — run E2E

