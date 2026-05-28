# AGENTS.md — Dealinno
# Read this before every task. These rules are non-negotiable.

## What This Project Is
Dealinno is an autonomous sales workflow tool. When a sales meeting ends, it auto-drafts
follow-up emails, proposals, SOWs, and decks and drops them into Gmail drafts.
Repo: github.com/ALLENDE123X/dealinno | Live: dealinno.vercel.app

---

## How AI Agents Collaborate on This Project

This project is worked on by AI agents. There are two roles:

**Claude Desktop (claude.ai)**
Role: architect, browser agent, spec manager, ticket manager, debugger.
What it does: research, architecture decisions, browser automation (navigating logged-in
sessions like Supabase/Sentry/Upstash/Google Cloud/GitHub), maintaining the PRD Google Doc,
creating and prioritizing GitHub Issues (tickets), writing/refining AI prompts in lib/ai/,
debugging logic errors. Claude Desktop owns the ticket backlog — coders never create tickets.

**The Coder (Antigravity IDE OR Claude Code)**
Role: coder, terminal runner, file editor. Either agent can fill this role interchangeably.
What it does: picks up tickets from GitHub Issues, writes and edits code files, runs terminal
commands (npm, drizzle-kit, git), installs packages, manages git commits/pushes, opens PRs.
Both read the same PRD, follow the same standards, use the same ticket board.

---

## Ticket System — GitHub Issues (source of truth for WHAT to build)

All work is tracked as GitHub Issues in github.com/ALLENDE123X/dealinno, organized on a
GitHub Projects board ("Dealinno Roadmap") with columns: Backlog → Ready → In Progress → In Review → Done.

**Rules for the coder (Antigravity or Claude Code):**
- At session start, read the PRD Google Doc, then look at the Project board
- Pick up the TOP issue in the "Ready" column. Do not pick from Backlog — only Claude Desktop promotes Backlog → Ready
- Assign the issue to yourself and move it to "In Progress"
- Build exactly what the issue describes — nothing more
- In your PR body, include `closes #N` (the issue number) so the ticket auto-moves to Done on merge
- If you discover new work, do NOT create a ticket yourself — tell the user, who relays to Claude Desktop

**Claude Desktop owns:** creating issues, writing acceptance criteria, setting labels/priority,
promoting Backlog → Ready, and keeping the board accurate.

Issue labels: `phase-1`, `phase-2`, `ready`, `blocked`, `needs-legal-review`, `bug`, `feature`, `infra`, `security`

---

## PRD — The Master Google Doc (source of truth for HOW it works)

https://docs.google.com/document/d/1iBMTWul12JbRf4mM5LFnFoyD9DsYkczJZZYkJbaDDo0/edit

The Google Doc is the Product Requirements Doc: product vision, architecture, DB schema,
data flows, code standards, and roadmap. It does NOT contain the live task list anymore —
tickets live in GitHub Issues. Read these PRD sections before writing feature code:
Section 4 (schema), Section 5 (file structure), Section 8 (data flows), Section 14 (standards).

---

## Tech Stack
- Framework: Next.js 16 (App Router) + Vercel
- Auth: NextAuth v5 beta + @auth/drizzle-adapter
- DB: Supabase (Postgres) via Drizzle ORM
- Background jobs: Inngest (functions in /inngest/functions/)
- Billing: Stripe
- Email/Calendar: Gmail API + Google Calendar API (googleapis)
- AI classify/draft: GPT-4o mini (OpenAI)
- AI doc generation: Gemini 2.0 Flash (@google/generative-ai)
- Transcription: Deepgram
- Logging: Pino + Axiom (lib/logger.ts)
- Rate limiting: Upstash Redis (lib/ratelimit.ts)
- Error tracking: Sentry (@sentry/nextjs — configs already exist)
- Styling: Tailwind CSS + shadcn/ui

---

## File Structure Rules
- DB schema: lib/db/schema.ts (source of truth — never deviate from column names here)
- DB client: lib/db/index.ts
- Inngest client: inngest/client.ts
- Inngest jobs: inngest/functions/*.ts
- AI prompts: lib/ai/*.ts
- Gmail helpers: lib/gmail.ts
- Google token refresh: lib/google.ts
- Logger: lib/logger.ts (always import this, never use console.log)
- Rate limiter: lib/ratelimit.ts
- API routes: app/api/*/route.ts

---

## Code Standards (Section 14 of PRD — mandatory)

### Every API route MUST have:
1. Auth check: `const session = await auth(); if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`
2. Rate limiting: `const { success } = await limitRequest(userId); if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })`
3. Zod validation on request body
4. Structured logging: `logger.info({ userId, action: 'action_name', duration_ms })`
5. Sentry error capture in catch blocks: `Sentry.captureException(error, { extra: { userId, action } })`

### Every Inngest job MUST have:
1. try/catch wrapping all logic
2. Sentry.captureException + re-throw on error (so Inngest marks failed and retries)
3. logger.info at start, each step, and completion with jobId + userId
4. Never log: tokens, email bodies, transcripts, API keys

### Never:
- Use console.log (use logger)
- Write raw SQL (use Drizzle)
- Skip Zod validation on external input
- Commit broken or untested code
- Create new DB columns not in lib/db/schema.ts without updating the PRD first

---

## Git & PR Rules
- Main branch is PROTECTED. Never commit directly to main.
- Every feature or fix gets its own branch: `feature/scope-description` or `fix/scope-description`
- Branch naming: `feature/phase1-email-classify`, `fix/draft-mime-encoding`, `chore/install-vitest`
- One ticket = one branch = one PR. Keep PRs small and focused.
- PR body MUST include `closes #N` referencing the GitHub Issue it resolves
- PRs cannot be merged to main until ALL tests pass in CI (GitHub Actions)
- After completing any task involving a technical choice, append a decision entry to ARCHITECTURE.md

## PR Audit Gates (ALL must pass before a PR is marked ready for review)

### 1. Security audit
- [ ] No secrets or tokens logged or returned in responses
- [ ] All new routes have auth check, rate limiting, and Zod validation
- [ ] All new Inngest jobs have try/catch with Sentry.captureException + re-throw
- [ ] npm audit --audit-level=high passes
- [ ] No new environment variables hardcoded (all in .env.local)
- [ ] Webhook routes verify signatures (Stripe: constructEvent, Pub/Sub: Bearer token)

### 2. Legal / compliance audit (NEW — required on every PR)
Run this checklist on all new code. If ANY item is a "yes" with an unresolved action,
add the `needs-legal-review` label to the PR and flag the user — do NOT mark ready for review.

- [ ] Does this collect or store any NEW category of user data?
      → If yes: confirm the Privacy Policy covers this data type + retention period, or flag an update.
- [ ] Does this add a NEW third-party service that processes user data? (email content, calendar, payments)
      → If yes: confirm their DPA/terms are acceptable and we're covered as a data processor.
- [ ] Does this add or change an OAuth scope?
      → If yes: flag for Claude Desktop — Google may require re-verification of the consent screen.
- [ ] Does this change email sending / drafting behavior?
      → If yes: CAN-SPAM (unsubscribe, sender identity) + GDPR email-processing compliance check.
- [ ] Does this change billing or subscription behavior?
      → If yes: confirm the TOS accurately describes the new behavior before shipping.
- [ ] Does this affect a user's ability to delete or export their data?
      → If yes: confirm GDPR Art. 17 (erasure) and Art. 20 (portability) still work.
- [ ] Does this introduce NEW AI processing of user content? (emails, transcripts, meeting notes)
      → If yes: confirm the Privacy Policy discloses AI processing of that content.

For most PRs every answer is "no" and this takes 30 seconds. Its purpose is to catch a
compliance obligation BEFORE it ships, not to require a lawyer on every change.

### 3. Tests (enforced in CI — PR will not merge without these)

| Change type | Required test |
|---|---|
| New API route | Vitest integration test hitting the route with mock auth |
| New Inngest job | Vitest unit test for each step function |
| UI component or page | Playwright E2E test asserting key elements and interactions |
| New lib/ utility | Vitest unit test |
| Config / chore / deps | No test required |

Test file locations:
- Unit/integration tests: `__tests__/` adjacent to the file being tested, or `tests/unit/`
- E2E/UI tests: `tests/e2e/`
- Test command: `npm test` (Vitest)
- E2E command: `npx playwright test`

Do not skip tests to ship faster. A PR without required tests will fail CI and cannot merge.

## Commit message format (within a feature branch)
`type(scope): description` e.g. `feat(inngest): add classify step to process-email job`

## PR title format
`[Phase 1] feat: Gmail Pub/Sub webhook receiver`

---

## Import Aliases
- `@/` maps to project root
- `@/lib/db` → lib/db/index.ts
- `@/lib/logger` → lib/logger.ts
- `@/lib/ratelimit` → lib/ratelimit.ts
- `@/inngest/client` → inngest/client.ts
