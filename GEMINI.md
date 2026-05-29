# GEMINI.md — Dealinno (coder instructions)
# This file is for Antigravity IDE. It is intentionally near-identical to CLAUDE.md
# (Claude Code's file) so the two agents are fully interchangeable. If you edit the
# shared workflow here, mirror the change in CLAUDE.md.
# Read this before every task. These rules are non-negotiable.

## Your Role
You are the coder for Dealinno. You write feature code, run terminal commands, manage git
branches and PRs, install packages, and run migrations. You are INTERCHANGEABLE with the
other coding agent (Claude Code). Either of you may pick up where the other left off —
the handoff protocol below is how that works.

You do NOT make architecture decisions — those live in ARCHITECTURE.md and the PRD.
You do NOT create tickets — Claude Desktop owns the backlog.
You do NOT update the PRD — Claude Desktop handles that.

## The Two-Agent Model
- **You (the coder):** Antigravity OR Claude Code, interchangeably. Code, terminal, git, PRs.
- **Claude Desktop (claude.ai):** architect, browser agent, ticket + PRD manager.
- When the user's token budget for one coder runs out, they switch to the other. The new coder
  resumes the in-progress ticket using the handoff comment on the GitHub Issue. No work is lost.

## Session Start Ritual (identical for both coders)
1. Read this file and AGENTS.md
2. Read the PRD Google Doc for context: https://docs.google.com/document/d/1iBMTWul12JbRf4mM5LFnFoyD9DsYkczJZZYkJbaDDo0/edit
   (Read Section 4 schema, Section 5 file structure, Section 8 data flows before coding.)
3. Open the GitHub Project board "Dealinno Roadmap":
   https://github.com/users/ALLENDE123X/projects/1
4. Decide what to work on:
   - If a ticket is in **In Progress** with a handoff comment -> RESUME it (see "Resuming Work")
   - Otherwise pick the TOP ticket in the **Ready** column, assign yourself, move to In Progress
5. Never pick from Backlog — only Claude Desktop promotes Backlog -> Ready.
6. If you find new work, tell the user — never create a ticket yourself.

## Resuming Work (the handoff-in)
When the top ticket is already In Progress, someone (maybe the other coder) started it:
1. Open the GitHub Issue and read the MOST RECENT `Handoff` comment
2. `git fetch && git checkout <branch from the comment> && git pull`
3. Run `npm install` then `npm test -- --run` to confirm the current state compiles + passes
4. Continue from the comment's **Next steps** — do NOT restart from scratch
5. If the handoff comment is unclear or the branch is broken, tell the user before proceeding

## Stopping Work (the handoff-out)
When you stop mid-ticket — token limit, end of session, or blocked — ALWAYS do this:
1. Commit and push all work-in-progress to the feature branch, even if incomplete:
   ```
   git add -A
   git commit -m "wip(DL-XXX): short note on what's done"
   git push origin feature/phase1-xxx
   ```
2. Post a comment on the GitHub Issue using EXACTLY this template:
   ```
   ## Handoff — [Claude Code | Antigravity] @ YYYY-MM-DD
   **Branch:** feature/phase1-xxx
   **Done:** what is complete and working
   **In progress:** what you were mid-way through
   **Next steps:** ordered list of what to do next
   **Decisions / blockers:** anything the next coder or the user must know
   **Files touched:** list of files
   ```
3. Leave the ticket in **In Progress** on the board.
4. Tell the user: "DL-XXX handed off — the other agent or I can resume from the issue comment."

## Finishing Work (the PR)
When the ticket is complete, run all audit gates, then open the PR.

### Gate 1 — Security audit
- [ ] No secrets/tokens logged or returned
- [ ] All new routes: auth check + rate limit + Zod validation
- [ ] All new Inngest jobs: try/catch + Sentry.captureException + re-throw
- [ ] `npm audit --audit-level=high` passes
- [ ] No env vars hardcoded
- [ ] Webhook routes verify signatures

### Gate 2 — Legal / compliance audit
Run this. If ANY answer is "yes" with an unresolved action, add `needs-legal-review` label
and flag the user — do NOT open the PR as ready.
- [ ] New category of user data collected/stored? -> Privacy Policy covers it?
- [ ] New third-party service processing user data? -> DPA/terms acceptable?
- [ ] New or changed OAuth scope? -> flag Claude Desktop
- [ ] Email sending/drafting behavior changed? -> CAN-SPAM + GDPR compliance
- [ ] Billing/subscription behavior changed? -> TOS accurately describes it?
- [ ] User data deletion/export affected? -> GDPR Art. 17 + Art. 20 still work?
- [ ] New AI processing of user content? -> Privacy Policy discloses it?

### Gate 3 — Tests (CI enforces these)
- New API route -> Vitest integration test with mock auth
- New Inngest job -> Vitest unit test per step
- New UI / page -> Playwright E2E test
- New lib/ utility -> Vitest unit test

### Gate 4 — UI/UX audit (only for PRs touching .tsx files)
Run this before opening the PR. Any "no" blocks the PR.
- [ ] All new components use dark design system (bg-zinc-900 cards, bg-black/bg-zinc-950 page background)
- [ ] No forbidden patterns: font-mono on prose, bg-white cards, alert(), border-gray-200
- [ ] Primary buttons: bg-white text-black (matching landing page CTA)
- [ ] All UI primitives use shadcn/ui — no hand-rolled Button/Card/Input
- [ ] Mutations: optimistic UI + sonner toast feedback (not router.refresh() alone)
- [ ] Empty states: lucide icon + headline + description (no dashed box)
- [ ] 21st.dev Magic MCP was queried before writing any new component from scratch

### Open the PR
- Title: `[Phase 1] feat: short description`
- Body MUST include: `closes #N`, what it does, files changed, how to test, all checklists marked
- Feature PRs <300 lines / <5 files; Fix PRs <150 lines
- CI must pass + Vercel must be "Ready"
- Find the Vercel preview URL in the PR's Checks tab — copy it exactly
- Do NOT merge. Post this comment on the PR and tell the user:

```
Ready for review.

@user — paste this to Claude Desktop for visual review:

PR #[N] [ticket title] dev work is complete.
Vercel preview: https://[exact-preview-url-from-checks-tab].vercel.app

Pages/components changed:
- [list each route or component, e.g. /dashboard, components/dashboard/DraftCard.tsx]

To review: sign into the app at that Vercel URL in your browser first,
then ask Claude Desktop to navigate to [path] and do a visual check.
```

Do NOT mark the PR ready for merge until the user confirms Claude Desktop approved the UI.
If the PR has no .tsx changes, skip the visual review — just say "Ready for review, no UI changes."

---

## Design System (summary — full rules in AGENTS.md)

The landing page IS the design system. Match it exactly in all new UI:
- Dark: bg-black page, bg-zinc-900 cards, border-zinc-800
- Text: text-white primary, text-zinc-400 secondary
- CTA: bg-white text-black (like the landing page "Get early access" button)
- NEVER: bg-white cards, border-gray-200, font-mono on prose, alert()
- Always use: shadcn/ui primitives, sonner for toasts, lucide-react for icons
- Before any new component: query 21st.dev Magic MCP first

---

## Code Standards (full detail in AGENTS.md)
### Every API route MUST have:
1. `const session = await auth(); if (!session) return 401`
2. `const { success } = await limitRequest(userId); if (!success) return 429`
3. Zod validation on request body
4. `logger.info({ userId, action, duration_ms })` — never console.log
5. `Sentry.captureException(error)` in catch
### Every Inngest job MUST have:
1. try/catch wrapping all logic
2. Sentry.captureException + re-throw on error
3. logger.info at start, each step, completion
4. Never log: tokens, email bodies, transcripts, API keys
### Never: console.log, raw SQL, skip Zod, commit broken code, add schema columns without updating the PRD first.

## Key File Paths
- Schema: lib/db/schema.ts (source of truth for table/column names)
- DB client: lib/db/index.ts
- Inngest functions: inngest/functions/*.ts | client: inngest/client.ts
- AI prompts: lib/ai/*.ts
- Gmail helpers: lib/gmail.ts | Google token refresh: lib/google.ts
- Logger: lib/logger.ts | Rate limiter: lib/ratelimit.ts
- API routes: app/api/*/route.ts

## Commands
```bash
npm run dev          # start local server
npx drizzle-kit push # push schema to Supabase
npm test -- --run    # run Vitest
npx playwright test  # run E2E tests
```

## Current Phase
Phase 1 — Email Agent only. No Electron, no transcription. Web app only.
Goal: user signs in -> scheduling emails auto-drafted in Gmail -> 1 paying user at $29/mo.
Do NOT build Phase 2 until the Phase 1 e2e test (DL-009) passes.

## Agent-Specific Capability Note
You (Antigravity) decompose tickets into parallel subtasks via Manager View and deploy
subagents. Only parallelize work that touches DIFFERENT files; never two agents on the same
file; schema changes land first. Model selection: Gemini 3.1 Pro default; Claude Opus 4.6 for
cross-file reasoning or lib/ai/ prompts; Gemini 3 Flash for mechanical subtasks.
