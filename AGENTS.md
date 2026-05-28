# AGENTS.md — Dealinno
# Read this before every task. These rules are non-negotiable.

## What This Project Is
Dealinno is an autonomous sales workflow tool. When a sales meeting ends, it auto-drafts
follow-up emails, proposals, SOWs, and decks and drops them into Gmail drafts.
Repo: github.com/ALLENDE123X/dealinno | Live: dealinno.vercel.app

---

## How AI Agents Collaborate on This Project

This project is worked on by two AI agents. You need to be aware of both.

**Claude (claude.ai — Claude Desktop, claude.ai/chat)**
Role: architect, browser agent, spec manager, debugger.
What Claude does: research, architecture decisions, browser automation (navigating logged-in
sessions like Supabase/Sentry/Upstash/Google Cloud), updating the Master Spec Google Doc,
writing and refining AI prompts in lib/ai/, debugging logic errors, answering "why" questions
about the system. Claude edits the Master Spec doc directly at the end of every session.

**Antigravity (Google Antigravity IDE)**
Role: coder, terminal runner, file editor.
What Antigravity does: writing and editing code files, running terminal commands (npm, drizzle-kit,
git), installing packages, managing git commits and pushes, testing that built features work.

**The handoff mechanism is the Master Spec Google Doc:**
https://docs.google.com/document/d/1iBMTWul12JbRf4mM5LFnFoyD9DsYkczJZZYkJbaDDo0/edit
Claude updates Sections 12 (Current State) and 13 (Next 3 Tasks) at the end of every session.
Antigravity reads it at the start of every session to know what's done and what to build next.
This is how both agents stay in sync without direct communication.

**Division of responsibility:**
- Architecture decisions → Claude makes them, logs them in ARCHITECTURE.md
- Writing lib/ai/ prompts → Claude writes first drafts, Antigravity can iterate
- Browser tasks (setting up services, getting API keys) → Claude via Chrome extension
- Writing feature code → Antigravity
- Running migrations, installs, git → Antigravity
- Updating the Master Spec → Claude (has google-docs MCP access)
- Debugging broken code → either, but bring Claude in for cross-file logic issues

**If you are unsure whether something is in scope for you:** check Section 13 of the spec.
If it's not listed there, don't build it — ask the user first.

## Master Spec
The single source of truth for architecture, schema, data flows, and roadmap is:
https://docs.google.com/document/d/1iBMTWul12JbRf4mM5LFnFoyD9DsYkczJZZYkJbaDDo0/edit

Read Sections 4 (schema), 5 (file structure), 8 (data flows), and 14 (standards)
before writing any feature code.

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

## Code Standards (Section 14 of spec — mandatory)

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
- Create new DB columns not in lib/db/schema.ts without updating the spec first

---

## Git Rules
- Commit after every working atomic unit
- Format: `type(scope): description` e.g. `feat(auth): NextAuth sign-in + token sync`
- Types: feat, fix, chore, refactor, test
- Always verify the specific thing works before committing
- Commit to main directly (no feature branches unless explicitly told otherwise)
- After completing any task involving a technical choice, append a decision entry to ARCHITECTURE.md

---

## Import Aliases
- `@/` maps to project root
- `@/lib/db` → lib/db/index.ts
- `@/lib/logger` → lib/logger.ts
- `@/lib/ratelimit` → lib/ratelimit.ts
- `@/inngest/client` → inngest/client.ts
