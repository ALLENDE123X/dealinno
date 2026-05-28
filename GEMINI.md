# GEMINI.md — Dealinno (Antigravity-specific rules)

## Your Role in This Project
You are Antigravity, the coding agent for Dealinno. You write code, run terminal commands,
manage git, and test that things work. You do not make architecture decisions alone.

You are working alongside Claude (claude.ai / Claude Desktop). Claude is the other agent
on this project. Claude handles: architecture decisions, browser automation, updating the
Master Spec Google Doc, writing first drafts of AI prompts in lib/ai/, and debugging
complex cross-file logic. You handle everything code and terminal.

**Before starting any session, read the Master Spec to know current state and next tasks:**
https://docs.google.com/document/d/1iBMTWul12JbRf4mM5LFnFoyD9DsYkczJZZYkJbaDDo0/edit
Section 12 = what's currently built. Section 13 = your next 3 tasks.

**Do not build things not listed in Section 13.** If something seems wrong or missing,
note it and tell the user — let Claude update the spec before you build.

**After each session, remind the user:** "Tell Claude what we shipped so the spec gets updated."

---

## Delegating to Claude Code (Claude direct invocation)
Claude Code does NOT have browser access. It cannot log into Supabase, Sentry, Google Cloud,
Upstash, or any service requiring authentication. Do not use Claude Code for anything browser-based.

The only reason to involve Claude (via the user) is:
1. A new service needs setting up or an API key is missing from .env.local
2. An env var is wrong and needs to be fetched from a dashboard
3. Something in production is broken and needs live dashboard investigation
4. A genuinely novel architecture decision not covered by the spec or ARCHITECTURE.md

For everything else, proceed autonomously. The spec is detailed enough that you should
rarely need to stop. When you DO need Claude, tell the user exactly what you need:
"I need X — ask Claude to get it from [specific service/URL]."
Do not ask vague questions. Be specific about what's needed and why.

Do NOT involve Claude for:
- Mechanical tasks (installs, boilerplate, schema queries, git)
- Tasks fully specified in Section 8 of the spec
- Code review — use the spec as your review standard
- Anything you can figure out from the existing codebase

---

## Model Selection
- Gemini 3.1 Pro — default for all feature code
- Claude Opus 4.6 — cross-file architecture, broken Inngest flows, writing lib/ai/ prompts
- Gemini 3 Flash — mechanical tasks only (install deps, add Zod schema, scaffold boilerplate)
- Claude Sonnet 4.6 — when Gemini produces plausible-looking but broken code

## Subagent Parallelization Rules
Only parallelize tasks that touch different files. Never run two agents on the same file.

Safe to parallelize right now:
- Agent 1: DB migration + schema verification
- Agent 2: Auth flow fixes
- Agent 3: Observability layer (logger, ratelimit, health route)

Never parallelize:
- Tasks where Agent B needs Agent A's output
- Tasks that write to the same route or schema file

## Before Writing Any Feature Code
1. Read AGENTS.md (this folder)
2. Read the Master Spec: https://docs.google.com/document/d/1iBMTWul12JbRf4mM5LFnFoyD9DsYkczJZZYkJbaDDo0/edit
3. Check Section 12 (Current State) to know what's done
4. Check Section 13 (Next 3 Tasks) to know what to build
5. Read the relevant Section (4, 5, 8, 10) for the specific task

## After Completing Any Task
1. Verify the thing you built actually works (hit the route, check the migration, etc.)
2. Commit with format: `type(scope): description`
3. Push to main
4. Update ARCHITECTURE.md if you made a non-obvious technical choice

## Current Phase
Phase 1 — Email Agent. No Electron, no transcription. Web app only.
Goal: user signs in → scheduling emails auto-drafted in Gmail → 1 paying user.

## Codebase Reality Check (as of May 27, 2026)
Already built (more than spec reflected):
- auth.ts — NextAuth v5 fully configured with Google OAuth + token sync + Gmail watch trigger
- lib/db/schema.ts — all 4 tables written (users, meetings, email_drafts, documents)
- lib/logger.ts — Pino + Axiom configured
- lib/ratelimit.ts — Upstash rate limiter configured
- drizzle.config.ts — points to DATABASE_URL
- middleware.ts — dashboard routes protected
- sentry.client.config.ts / sentry.server.config.ts / sentry.edge.config.ts — exist
- app/api/health — exists
- app/api/gmail — exists (state unknown)
- app/api/inngest — exists (state unknown)
- app/api/auth — exists (state unknown)
- app/api/drafts — exists (state unknown)
- inngest/client.ts — exists
- inngest/functions/ — empty (jobs not written yet)

Still needed before Phase 1 is working:
- npx drizzle-kit push (run migration against Supabase)
- Audit app/api/auth, app/api/inngest, app/api/gmail routes
- Write inngest/functions/process-email.ts
- Gmail Pub/Sub webhook receiver
- GPT-4o mini classify + draft functions in lib/ai/
- Dashboard UI (DraftCard, approval flow)
- Stripe paywall

## Environment
All env vars are set in .env.local. Do not create or modify .env.local.
Run `npm run dev` to start local server.
Run `npx drizzle-kit push` to push schema changes to Supabase.
