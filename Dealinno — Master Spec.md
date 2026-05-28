DEALINNO — MASTER SPEC
Last updated: May 27, 2026
════════════════════════════════════════════════════════════════════


This is the single source of truth for the Dealinno project.
Paste this doc URL into every new Claude / AI IDE session before writing any code.
Update "Current State" and "Next 3 Tasks" at the end of every session.


════════════════════════════════════════════════════════════════════
SECTION 1 — WHAT IT IS
════════════════════════════════════════════════════════════════════


Dealinno is an autonomous sales workflow tool for solo founders and small sales teams.
After a sales meeting ends, Dealinno automatically drafts follow-up emails, proposals,
SOWs, and decks — and drops them into Gmail drafts for one-click send. No manual work.


Core loop (fully built out across 3 phases):
  Calendar detects meeting
  → Electron records system audio
  → Deepgram transcribes in real-time
  → Claude/GPT classifies intent + drafts reply in user's voice
  → Proposal/SOW/deck generated
  → Everything lands in Gmail drafts
  → User reviews + one-click sends


Modeled after: Granola (meeting intelligence) + Cluely (invisible AI overlay)
Target user: solo founders and AEs doing outbound, 10-50 meetings/month
Domain: dealinno.vercel.app
Repo: github.com/ALLENDE123X/dealinno
Google Cloud project: Dealinno
Supabase project: Dealinno




════════════════════════════════════════════════════════════════════
SECTION 2 — PRODUCT ROADMAP
═════════════════════════════════════════════════════════════���══════


PHASE 1 — EMAIL AGENT (Weeks 1–3)
──────────────────────────────────
Goal: User signs in with Google → scheduling/follow-up emails auto-drafted in Gmail.
No Electron, no transcription. Web app only. Validation: 1 paying user.


Week 1:
- Install all missing npm dependencies
- Set up Drizzle schema + run first migration on Supabase
- Fix NextAuth Google OAuth flow (sign in, session, token storage)
- On sign-in: auto-call Gmail watch API to set up push notifications
- Inngest cron: renew Gmail watch every 6 days (expires at 7)


Week 2:
- Gmail Pub/Sub webhook receiver (/api/webhooks/gmail)
- Inngest job: fetch new emails via Gmail history API
- GPT-4o mini: classify email intent (scheduling, follow-up, proposal request, other)
- GPT-4o mini: generate draft reply in user's voice
- Create draft in Gmail via API, save to DB


Week 3:
- Dashboard UI: see pending drafts, approve/reject/edit
- Stripe paywall: $29/month subscription, gate behind auth
- Stripe webhook: handle subscription events
- Submit Google OAuth for verification (starts 2-4 week clock)
- Validation gate: 1 real user pays, says "this saved me time"


──────────────────────────────────
PHASE 2 — DOC GENERATION AGENT (Weeks 4–6)
──────────────────────────────────
Goal: Paste a meeting transcript → get a proposal, SOW, or deck generated and
attached to a Gmail draft, ready to send. Validation: 3 users pay $9/doc.


Week 4:
- Transcript input UI (paste text, select doc type)
- Gemini 2.0 Flash integration for long-context transcript processing
- Structured JSON extraction per doc type (proposal, SOW, deck)
- Documents table + Inngest job for async generation


Week 5:
- pptxgenjs: generate .pptx deck from structured JSON
- Puppeteer: generate PDF from HTML template for proposals/SOWs
- Supabase Storage: upload generated files, return signed URLs
- Attach generated file to Gmail draft


Week 6:
- Polish generation quality with prompt tuning
- Document history UI (see all generated docs, re-download)
- Per-doc Stripe billing ($9/doc or metered on subscription)
- Validation gate: 3 paying doc generations


──────────────────────────────────
PHASE 3 — MEETING TRANSCRIPTION (Weeks 7–10)
──────────────────────────────────
Goal: Fully automatic pipeline. Meeting ends → everything happens with zero manual steps.
Validation: 5 users run full loop without touching anything.


Week 7-8:
- Electron app scaffold (Mac first)
- System audio capture via ScreenCaptureKit
- Deepgram WebSocket: real-time transcription with speaker diarization
- Invisible overlay window showing live transcript


Week 9:
- Google Calendar polling (every 60s) to detect upcoming meetings
- Auto-start recording 30s before meeting start time
- Auto-stop when calendar event ends or user manually stops
- Send completed transcript to /api/meetings/transcripts


Week 10:
- Connect transcription to Phase 1+2 pipeline (auto-trigger email + doc generation)
- End-to-end test: meeting → transcript → draft email → draft proposal → Gmail
- Electron auto-update mechanism
- Mac App Store or direct download distribution




════════════════════════════════════════════════════════════════════
SECTION 3 — TECH STACK
════════════════════════════════════════════════════════════════════


Frontend/Backend:   Next.js 14 (App Router) + Vercel
Auth:               NextAuth v5 (Google OAuth provider)
Database:           Supabase (Postgres)
ORM:                Drizzle ORM
Background jobs:    Inngest
Billing:            Stripe (subscriptions + metered)
Email/Calendar:     Gmail API + Google Calendar API (via googleapis npm)
Transcription:      Deepgram (nova-2 model, WebSocket for real-time)
AI — classify/draft: GPT-4o mini (cheap, fast, good at JSON + email)
AI — doc generation: Gemini 2.0 Flash (1M context window, cheapest for long transcripts)
Deck generation:    pptxgenjs (server-side .pptx generation)
PDF generation:     Puppeteer (HTML → PDF, runs on Vercel via @sparticuz/chromium)
File storage:       Supabase Storage
Desktop app:        Electron (Phase 3)
Styling:            Tailwind CSS + shadcn/ui




════════════════════════════════════════════════════════════════════
SECTION 4 — DATABASE SCHEMA (Drizzle / Postgres)
════════════════════════════════════════════════════════════════════


All defined in: lib/db/schema.ts
Run migrations with: npx drizzle-kit push


──────────────────────────────────
TABLE: users
──────────────────────────────────
id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid()
email                 text          NOT NULL UNIQUE
name                  text
avatar_url            text
google_access_token   text          -- stored encrypted, refreshed via NextAuth
google_refresh_token  text          -- stored encrypted
google_token_expiry   timestamp
gmail_watch_expiration timestamp    -- Gmail push notification sub expires every 7 days
gmail_history_id      text          -- last processed Gmail historyId for incremental sync
stripe_customer_id    text          UNIQUE
stripe_subscription_id text
stripe_subscription_status text     -- 'active' | 'canceled' | 'past_due' | 'trialing'
created_at            timestamp     NOT NULL DEFAULT now()
updated_at            timestamp     NOT NULL DEFAULT now()


Notes:
- gmail_history_id is critical — Gmail push only sends a historyId, not the message.
  We use this to call history.list() and get what actually changed since last time.
- gmail_watch_expiration: Inngest cron checks this daily and renews if within 24h of expiry.
- Tokens stored by NextAuth in next-auth adapter tables (separate) but we mirror
  access/refresh tokens into users table for server-side Gmail API calls outside of
  the request cycle (i.e. in Inngest jobs that run async).


──────────────────────────────────
TABLE: email_drafts
──────────────────────────────────
id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid()
user_id               uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE
meeting_id            uuid          REFERENCES meetings(id) ON DELETE SET NULL  -- nullable, Phase 3
gmail_thread_id       text          NOT NULL   -- the Gmail thread this is a reply to
gmail_message_id      text          NOT NULL   -- the specific message being replied to
gmail_draft_id        text          -- Gmail draft ID once created in Gmail
subject               text          NOT NULL
to_addresses          text[]        NOT NULL   -- array of recipient emails
body_html             text          NOT NULL
body_text             text          NOT NULL
classification        text          NOT NULL   -- 'scheduling' | 'follow_up' | 'proposal_request' | 'check_in'
classification_confidence float     NOT NULL
key_points            text[]        -- extracted by GPT from the original email
status                text          NOT NULL DEFAULT 'pending_review'
                                    -- 'pending_review' | 'approved' | 'sent' | 'rejected' | 'error'
error_message         text          -- if status = 'error', what went wrong
created_at            timestamp     NOT NULL DEFAULT now()
updated_at            timestamp     NOT NULL DEFAULT now()


──────────────────────────────────
TABLE: meetings
──────────────────────────────────
id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid()
user_id               uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE
google_event_id       text          NOT NULL   -- Google Calendar event ID
title                 text
start_time            timestamp     NOT NULL
end_time              timestamp
attendees             jsonb         -- [{ name: string, email: string }]
transcript_raw        text          -- raw Deepgram output (full JSON with timestamps)
transcript_text       text          -- plain text version for AI processing
transcript_summary    text          -- GPT-generated summary (action items, decisions)
status                text          NOT NULL DEFAULT 'scheduled'
                                    -- 'scheduled' | 'recording' | 'transcribed' | 'processed' | 'error'
created_at            timestamp     NOT NULL DEFAULT now()
updated_at            timestamp     NOT NULL DEFAULT now()


──────────────────────────────────
TABLE: documents
──────────────────────────────────
id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid()
user_id               uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE
meeting_id            uuid          REFERENCES meetings(id) ON DELETE SET NULL   -- nullable
email_draft_id        uuid          REFERENCES email_drafts(id) ON DELETE SET NULL  -- nullable
doc_type              text          NOT NULL
                                    -- 'proposal' | 'sow' | 'deck' | 'follow_up_email'
title                 text          NOT NULL
content_json          jsonb         -- structured content extracted by AI (see schema below)
file_path             text          -- Supabase Storage path
file_url              text          -- signed URL for download
google_drive_file_id  text          -- if user exports to Drive
status                text          NOT NULL DEFAULT 'generating'
                                    -- 'generating' | 'complete' | 'failed'
error_message         text
created_at            timestamp     NOT NULL DEFAULT now()
updated_at            timestamp     NOT NULL DEFAULT now()


──────────────────────────────────
content_json SCHEMAS (per doc_type)
──────────────────────────────────


For doc_type = 'proposal':
{
  client_name: string,
  client_company: string,
  problem_statement: string,
  proposed_solution: string,
  deliverables: string[],
  timeline: string,
  investment: string,       // pricing
  why_us: string,
  next_steps: string[]
}


For doc_type = 'sow':
{
  project_name: string,
  client_name: string,
  scope_of_work: string,
  deliverables: [{ item: string, description: string, due_date: string }],
  out_of_scope: string[],
  milestones: [{ name: string, deliverable: string, payment: string, due_date: string }],
  payment_schedule: string,
  acceptance_criteria: string,
  change_order_process: string
}


For doc_type = 'deck':
{
  title: string,
  slides: [
    {
      slide_number: number,
      layout: 'title' | 'problem' | 'solution' | 'how_it_works' | 'pricing' | 'cta',
      heading: string,
      body: string,
      bullet_points: string[],
      speaker_notes: string
    }
  ]
}




════════════════════════════════════════════════════════════════════
SECTION 5 — FILE STRUCTURE
════════════════════════════════════════════════════════════════════


dealinno/
├── app/
│   ├── page.tsx                              ✅ Landing page (complete)
│   ├── layout.tsx                            Root layout
│   ├── dashboard/
│   │   ├── page.tsx                          Main dashboard (drafts + docs list)
│   │   └── layout.tsx                        Auth-gated layout
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts                  ✅ exists (unknown state — needs audit)
│       ├── webhooks/
│       │   ├── gmail/
│       │   │   └── route.ts                  Gmail Pub/Sub push receiver
│       │   └── stripe/
│       │       └── route.ts                  Stripe webhook handler
│       ├── inngest/
│       │   └── route.ts                      ✅ exists (unknown state — needs audit)
│       ├── gmail/
│       │   └── watch/
│       │       └── route.ts                  POST: set up Gmail push notifications for authed user
│       ├── documents/
│       │   └── generate/
│       │       └── route.ts                  POST: trigger async doc generation
│       └── meetings/
│           └── transcripts/
│               └── route.ts                  POST: receive transcript from Electron app
│
├── lib/
│   ├── db/
│   │   ├── schema.ts                         Drizzle table definitions (source of truth)
│   │   └── index.ts                          Drizzle client (connects to Supabase)
│   ├── inngest/
│   │   ├── client.ts                         Inngest client instance
│   │   └── functions/
│   │       ├── process-email.ts              Job: classify + draft reply for new email
│   │       ├── generate-document.ts          Job: generate proposal/SOW/deck from transcript
│   │       ├── process-transcript.ts         Job: summarize transcript + trigger downstream
│   │       └── renew-gmail-watch.ts          Cron: renew Gmail push subscription every 6 days
│   ├── ai/
│   │   ├── classify-email.ts                 GPT-4o mini prompt: email intent classification
│   │   ├── draft-email.ts                    GPT-4o mini prompt: reply generation
│   │   ├── summarize-transcript.ts           GPT-4o mini prompt: transcript → summary + action items
│   │   └── generate-content.ts              Gemini 2.0 Flash: transcript → structured doc content
│   ├── gmail.ts                              ✅ exists (corrupted — rebuild)
│   │                                         Gmail API helpers: getMessages, createDraft, watchInbox, getHistory
│   ├── google.ts                             Google OAuth token refresh helper
│   ├── documents/
│   │   ├── generate-deck.ts                  pptxgenjs: JSON → .pptx buffer
│   │   └── generate-pdf.ts                   Puppeteer: HTML template → PDF buffer
│   ├── storage.ts                            Supabase Storage: upload file, get signed URL
│   └── stripe.ts                             Stripe client + helpers
│
├── components/
│   ├── dashboard/
│   │   ├── DraftCard.tsx                     Email draft: shows subject, body preview, approve/reject buttons
│   │   ├── DocumentCard.tsx                  Generated doc: shows type, title, download/send buttons
│   │   └── EmptyState.tsx
│   └── ui/                                   shadcn components (button, card, badge, etc.)
│
├── drizzle.config.ts                         Points to Supabase connection string
├── middleware.ts                             Protect /dashboard routes — redirect to / if not authed
├── .env.local                                ✅ populated (see Section 7)
└── package.json                              ⚠️ missing most deps (see Section 6)




════════════════════════════════════════════════════════════════════
SECTION 6 — DEPENDENCIES TO INSTALL
════════════════════════════════════════════════════════════════════


Run this in the repo root:


npm install \
  drizzle-orm \
  drizzle-kit \
  @supabase/supabase-js \
  @supabase/ssr \
  next-auth@beta \
  @auth/drizzle-adapter \
  googleapis \
  inngest \
  stripe \
  @google/generative-ai \
  openai \
  @deepgram/sdk \
  pptxgenjs \
  puppeteer-core \
  @sparticuz/chromium \
  postgres \
  @types/node \
  --save


npm install drizzle-kit --save-dev


Notes:
- Use next-auth@beta (v5) — NOT next-auth v4. API is different.
- @sparticuz/chromium: lightweight Chromium for Puppeteer on Vercel serverless.
- postgres: the Drizzle postgres driver for connecting to Supabase.
- drizzle-kit: for running migrations (npx drizzle-kit push).




════════════════════════════════════════════════════════════════════
SECTION 7 — ENVIRONMENT VARIABLES
════════════════════════════════════════════════════════════════════


All vars needed in .env.local and in Vercel dashboard (Settings → Environment Variables).


# NextAuth
NEXTAUTH_URL=https://dealinno.vercel.app        # ⚠️ currently localhost:3000 — fix for prod
NEXTAUTH_SECRET=<random string>                  ✅ set


# Google OAuth (from Google Cloud Console → Credentials → Dealinno Web Client)
GOOGLE_CLIENT_ID=<your client id>               ✅ set
GOOGLE_CLIENT_SECRET=<your client secret>       ✅ set


# Supabase (from Supabase dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co    ✅ set (had typo KUPABASE, now fixed)
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>              ✅ set
SUPABASE_SERVICE_ROLE_KEY=<service role key>           ✅ set
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
  -- needed for Drizzle direct connection. Get from Supabase → Settings → Database → Connection string


# OpenAI
OPENAI_API_KEY=<your key>                        ✅ set


# Deepgram
DEEPGRAM_API_KEY=<your key>                      ✅ set


# Inngest
INNGEST_EVENT_KEY=<your key>                     ✅ set
INNGEST_SIGNING_KEY=<your key>                   ✅ set


# Google Pub/Sub
GOOGLE_PUBSUB_TOPIC=projects/dealinno/topics/gmail-notifications   ✅ set


# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...              ⚠️ currently live key — swap to test
STRIPE_SECRET_KEY=sk_test_...                   ⚠️ currently live key — swap to test
STRIPE_WEBHOOK_SECRET=whsec_...                 ❌ missing — create webhook in Stripe dashboard
                                                   pointing to https://dealinno.vercel.app/api/webhooks/stripe


# Google AI (Gemini) — for doc generation
GOOGLE_AI_API_KEY=<gemini api key>              ❌ missing — get from aistudio.google.com




════════════════════════════════════════════════════════════════════
SECTION 8 — DATA FLOWS (step-by-step)
════════════════════════════════════════════════════════════════════


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1: EMAIL AGENT FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


STEP 1 — User signs in
  User clicks "Sign in with Google" on landing page
  → NextAuth handles OAuth redirect
  → Google returns access_token + refresh_token
  → NextAuth stores tokens in DB (next-auth adapter tables)
  → We ALSO copy access_token + refresh_token + expiry into users table
    (needed for server-side Gmail API calls in Inngest jobs that run outside request cycle)
  → On successful sign-in callback: POST /api/gmail/watch


STEP 2 — Gmail watch setup (/api/gmail/watch)
  Called automatically after sign-in (and by Inngest cron every 6 days)
  1. Get user's access token from DB
  2. Call: gmail.users.watch({
       userId: 'me',
       requestBody: {
         topicName: 'projects/dealinno/topics/gmail-notifications',
         labelIds: ['INBOX']
       }
     })
  3. Response includes: { historyId, expiration }
  4. Save historyId → users.gmail_history_id
  5. Save expiration → users.gmail_watch_expiration
  Note: This gives Gmail permission to push to our Pub/Sub topic when new mail arrives.


STEP 3 — New email arrives
  Gmail detects new message in user's inbox
  → Gmail pushes to Pub/Sub topic: projects/dealinno/topics/gmail-notifications
  → Pub/Sub delivers HTTP POST to: https://dealinno.vercel.app/api/webhooks/gmail
  → Payload:
    {
      "message": {
        "data": "<base64 encoded JSON>",   // decodes to: { emailAddress, historyId }
        "messageId": "...",
        "publishTime": "..."
      },
      "subscription": "projects/dealinno/subscriptions/..."
    }


STEP 4 — Webhook receiver (/api/webhooks/gmail)
  1. Decode base64 message.data → { emailAddress, historyId }
  2. Look up user by emailAddress in DB
  3. If user not found or no valid token → return 200 (must return 200 or Pub/Sub retries forever)
  4. Fire Inngest event:
     await inngest.send({
       name: 'email/received',
       data: { userId: user.id, historyId }
     })
  5. Return 200 immediately (do NOT do heavy work in webhook — Inngest handles it async)


STEP 5 — Inngest job: process-email
  Triggered by: email/received event
  1. Fetch user from DB (get access_token, refresh_token, gmail_history_id)
  2. Refresh token if expired (call Google token endpoint)
  3. Call Gmail history API:
     gmail.users.history.list({
       userId: 'me',
       startHistoryId: user.gmail_history_id,
       historyTypes: ['messageAdded'],
       labelId: 'INBOX'
     })
  4. Extract new message IDs from history response
  5. For each new message ID:
     a. Fetch full message:
        gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' })
     b. Parse headers: Subject, From, To, Date
     c. Decode body (base64url decode parts[0].body.data or walk MIME tree for text/plain)
     d. Skip if: sent by us, is a newsletter/promotional, no-reply address, or already processed
  6. Update user.gmail_history_id = new historyId from response
  7. For each qualifying email → call classify-email


STEP 6 — AI: Email Classification (lib/ai/classify-email.ts)
  Model: gpt-4o-mini
  System prompt:
    "You are an email classifier for a sales professional. Analyze the email and return JSON only.
     Classify the intent and determine if a reply should be drafted."
  User prompt: full email text (subject + from + body)
  Expected JSON output:
    {
      "should_draft": true | false,
      "intent": "scheduling" | "follow_up" | "proposal_request" | "check_in" | "other",
      "confidence": 0.0–1.0,
      "key_points": ["...", "..."],    // 2-4 key points from the email
      "suggested_tone": "formal" | "casual" | "direct"
    }
  Rules:
    - If confidence < 0.65 → set should_draft = false
    - If intent = "other" → set should_draft = false
    - If should_draft = false → skip this email entirely, do not create a draft


STEP 7 — AI: Draft Generation (lib/ai/draft-email.ts)
  Model: gpt-4o-mini
  System prompt:
    "You are a senior sales assistant for [user.name]. Write email replies in their voice —
     direct, confident, first-person, no fluff. Never mention AI or that you're an assistant.
     Never use phrases like 'I hope this email finds you well' or 'Please don't hesitate'.
     Match the suggested tone. Reply only with the email body text, no subject line."
  User prompt:
    Original email: [full email]
    Intent: [classification.intent]
    Key points to address: [classification.key_points]
    Tone: [classification.suggested_tone]
    User's name: [user.name]
  Output: plain text email body (no JSON wrapper)
  Then: generate subject line (separate call or same call with JSON output)


STEP 8 — Create Gmail Draft
  Build MIME message:
    To: <original sender>
    Subject: Re: <original subject>
    In-Reply-To: <original message ID>
    References: <original message ID>
    Content-Type: text/plain; charset=utf-8
    [blank line]
    [email body]
  Base64url encode the entire MIME message
  Call: gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        threadId: <original thread ID>,
        raw: <base64url encoded MIME>
      }
    }
  })
  Save to email_drafts table:
    - gmail_draft_id (from response)
    - all fields
    - status: 'pending_review'


STEP 9 — User reviews in dashboard
  Dashboard shows DraftCard for each pending draft
  User can: Approve (→ marks approved, draft stays in Gmail for manual send)
            OR future: one-click send (→ gmail.users.drafts.send())
            OR Reject (→ deletes Gmail draft, marks rejected in DB)
            OR Edit (→ opens Gmail draft link)




━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2: DOC GENERATION FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


STEP 1 — User triggers doc generation
  User pastes transcript into dashboard UI
  Selects doc type: Proposal | SOW | Deck
  Clicks "Generate"
  → POST /api/documents/generate
    Body: { transcript: string, doc_type: string, meeting_id?: string }


STEP 2 — API route
  1. Validate user is authed + has active subscription
  2. Create documents record in DB: { status: 'generating', doc_type, user_id }
  3. Fire Inngest event:
     inngest.send({ name: 'document/generate', data: { documentId, transcript, doc_type, userId } })
  4. Return 200 with documentId immediately (generation is async)


STEP 3 — Inngest job: generate-document
  1. Call Gemini 2.0 Flash (lib/ai/generate-content.ts):
     Model: gemini-2.0-flash
     System: "Extract structured information from this meeting transcript to create a [doc_type].
              Return JSON matching this exact schema: [paste relevant content_json schema from Section 4]
              Return JSON only. No markdown. No explanation."
     User: full transcript text
     Parse JSON response → content_json


  2. Generate file based on doc_type:


     For 'deck':
       Call lib/documents/generate-deck.ts
       Use pptxgenjs to build .pptx:
         - Iterate content_json.slides
         - Apply layout per slide.layout type
         - Add heading, bullet_points, speaker_notes
       Return: Buffer (.pptx)


     For 'proposal' or 'sow':
       Call lib/documents/generate-pdf.ts
       Build HTML string from content_json using a template
       Launch Puppeteer with @sparticuz/chromium
       page.setContent(html)
       page.pdf({ format: 'A4', printBackground: true })
       Return: Buffer (PDF)


  3. Upload to Supabase Storage:
     Path: documents/{userId}/{documentId}.pptx or .pdf
     Bucket: 'documents' (private)
     Get signed URL (expires in 24h)


  4. Update documents record:
     { status: 'complete', file_path, file_url, content_json }


  5. (Optional) Attach to Gmail draft:
     If email_draft_id is set, update that draft to include file as attachment


STEP 4 — User downloads
  Dashboard shows DocumentCard with download button
  Click → hits signed Supabase Storage URL → file downloads




━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3: MEETING TRANSCRIPTION FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


STEP 1 — Electron app starts (runs in menu bar)
  On launch: authenticate user (reuse Google OAuth tokens from web app)
  Start polling Google Calendar: GET /api/calendar/upcoming every 60s
  Web app API returns: next meeting within 15 minutes (if any)


STEP 2 — Meeting about to start
  5 minutes before meeting start_time → show macOS notification: "Meeting starting soon. Start recording?"
  User clicks yes OR auto-starts (user preference setting)
  → Electron begins audio capture


STEP 3 — Audio capture
  Mac: use ScreenCaptureKit (via native addon or Swift helper process)
  Captures system audio output (catches Zoom, Google Meet, Teams audio)
  Streams raw PCM audio to Deepgram WebSocket


STEP 4 — Real-time transcription
  Open Deepgram WebSocket:
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en',
      punctuate: true,
      diarize: true,          // speaker labels
      interim_results: true,  // show words as they come in
      utterance_end_ms: 1000  // finalize utterance after 1s silence
    })
  Stream PCM chunks to WebSocket
  Receive transcript events → append to running transcript string
  Show in overlay window (BrowserWindow with transparent background, always on top, not in screen share)


STEP 5 — Meeting ends
  Detect via: calendar event end_time reached OR user manually stops
  Close Deepgram WebSocket
  Compile full transcript (diarized: "Speaker 1: ... Speaker 2: ...")
  POST to web app: /api/meetings/transcripts
    Body: {
      google_event_id: string,
      transcript_text: string,
      transcript_raw: string  // full Deepgram JSON with timestamps
    }


STEP 6 — API: /api/meetings/transcripts
  1. Look up or create meetings record by google_event_id
  2. Save transcript_text + transcript_raw
  3. Update status: 'transcribed'
  4. Fire Inngest event: meeting/transcribed with { meetingId }


STEP 7 — Inngest job: process-transcript
  1. Call GPT-4o mini to summarize:
     Extract: summary, action_items[], decisions[], follow_up_needed (bool), suggested_doc_types[]
  2. Save summary to meetings.transcript_summary
  3. Update status: 'processed'
  4. Auto-fire document/generate for each suggested_doc_type
  5. If follow_up_needed and there's a known email thread → auto-draft follow-up email
  6. Everything lands in dashboard for review




════════════════════════════════════════════════════════════════════
SECTION 9 — AUTH ARCHITECTURE
════════════════════════════════════════════════════════════════════


Using NextAuth v5 (beta) with Drizzle adapter.


auth.ts (root level):
  import NextAuth from 'next-auth'
  import Google from 'next-auth/providers/google'
  import { DrizzleAdapter } from '@auth/drizzle-adapter'
  import { db } from '@/lib/db'


  export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: DrizzleAdapter(db),
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            scope: [
              'openid',
              'email',
              'profile',
              'https://www.googleapis.com/auth/gmail.modify',
              'https://www.googleapis.com/auth/gmail.readonly',
              'https://www.googleapis.com/auth/gmail.send',
              'https://www.googleapis.com/auth/calendar.readonly',
              'https://www.googleapis.com/auth/calendar.events',
              'https://www.googleapis.com/auth/drive.file'
            ].join(' '),
            access_type: 'offline',   // REQUIRED to get refresh_token
            prompt: 'consent'         // REQUIRED to always get refresh_token on sign-in
          }
        }
      })
    ],
    callbacks: {
      async signIn({ user, account }) {
        // Copy tokens to our users table for server-side use
        if (account?.access_token) {
          await db.update(users)
            .set({
              google_access_token: account.access_token,
              google_refresh_token: account.refresh_token,
              google_token_expiry: new Date(account.expires_at * 1000)
            })
            .where(eq(users.email, user.email))
          // Trigger Gmail watch setup
          await fetch('/api/gmail/watch', { method: 'POST' })
        }
        return true
      }
    }
  })


middleware.ts:
  export { auth as middleware } from '@/auth'
  export const config = { matcher: ['/dashboard/:path*'] }


Token refresh helper (lib/google.ts):
  When making Gmail API calls in Inngest jobs, always check if access_token is expired.
  If expired: POST to https://oauth2.googleapis.com/token with refresh_token to get new access_token.
  Save new access_token + expiry back to users table.




════════════════════════════════════════════════════════════════════
SECTION 10 — INNGEST JOBS REFERENCE
════════════════════════════════════════════════════════════════════


All Inngest functions defined in lib/inngest/functions/
All served from app/api/inngest/route.ts


──────────────────────────────────
1. processEmailEvent
──────────────────────────────────
Trigger event: 'email/received'
Data: { userId: string, historyId: string }
Steps:
  step.run('fetch-email') → fetch message from Gmail
  step.run('classify') → call GPT-4o mini
  step.run('draft') → call GPT-4o mini
  step.run('create-gmail-draft') → Gmail API
  step.run('save-to-db') → insert email_drafts record
Retries: 3
Concurrency: limit to 1 per userId (prevent duplicate drafts if Pub/Sub fires twice)


──────────────────────────────────
2. generateDocument
──────────────────────────────────
Trigger event: 'document/generate'
Data: { documentId: string, transcript: string, doc_type: string, userId: string }
Steps:
  step.run('generate-content') → Gemini API
  step.run('generate-file') → pptxgenjs or Puppeteer
  step.run('upload-file') → Supabase Storage
  step.run('update-db') → update documents record
Timeout: 5 minutes (Puppeteer can be slow)
Retries: 2


──────────────────────────────────
3. processMeetingTranscript
──────────────────────────────────
Trigger event: 'meeting/transcribed'
Data: { meetingId: string }
Steps:
  step.run('summarize') → GPT-4o mini
  step.run('update-meeting') → save summary to DB
  step.run('trigger-docs') → fire document/generate events
  step.run('trigger-email') → fire email draft if needed
Retries: 2


──────────────────────────────────
4. renewGmailWatch (cron)
──────────────────────────────────
Trigger: cron schedule '0 0 * * *' (daily at midnight)
Logic:
  Fetch all users where gmail_watch_expiration < now() + 24 hours
  For each: call Gmail watch API to renew
  Update gmail_watch_expiration in DB
Retries: 3 per user




════════════════════════════════════════════════════════════════════
SECTION 11 — STRIPE BILLING
════════════════════════════════════════════════════════════════════


Plan: $29/month subscription
Gate: all dashboard features require active subscription
Trial: 7-day free trial on sign-up (no credit card required for trial)


Stripe webhook events to handle (/api/webhooks/stripe):
  - customer.subscription.created → set status = 'active'
  - customer.subscription.updated → update status
  - customer.subscription.deleted → set status = 'canceled', block dashboard access
  - invoice.payment_failed → set status = 'past_due', show banner in dashboard
  - checkout.session.completed → create/link Stripe customer to user


Middleware check:
  In dashboard layout: if user.stripe_subscription_status not in ['active', 'trialing'] → redirect to /pricing


Future (Phase 2): add per-doc metered billing ($9/doc) for doc generation
  Using Stripe metered subscriptions or one-time payment intents




════════════════════════════════════════════════════════════════════
SECTION 12 — CURRENT STATE
════════════════════════════════════════════════════════════════════


INFRASTRUCTURE ✅
- GitHub repo live at github.com/ALLENDE123X/dealinno
- Vercel deployment live at dealinno.vercel.app (200 OK)
- Supabase project created ("Dealinno")
- Google Cloud project created ("Dealinno")
- Gmail API + Calendar API + Pub/Sub + Google Docs API all enabled


GOOGLE OAUTH ✅
- Consent screen configured (branding, 8 scopes, test user, OAuth client)
- Status: TESTING — NOT submitted for verification yet (2-4 week clock not started)
- Must submit before launching to real users


PUB/SUB ✅
- Topic: projects/dealinno/topics/gmail-notifications


ENV VARS
- NEXTAUTH_URL / NEXTAUTH_SECRET ✅
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ✅
- NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY ✅
- OPENAI_API_KEY ✅
- DEEPGRAM_API_KEY ✅
- INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY ✅
- GOOGLE_PUBSUB_TOPIC ✅
- STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY ⚠️ still live keys — swap to test
- STRIPE_WEBHOOK_SECRET ❌ create webhook endpoint in Stripe first
- DATABASE_URL ❌ needed for Drizzle — get from Supabase Settings → Database
- GOOGLE_AI_API_KEY ❌ needed for Gemini (Phase 2) — get from aistudio.google.com
- NEXTAUTH_URL ⚠️ still localhost:3000 — update to https://dealinno.vercel.app


CODEBASE
- package.json: ALL dependencies installed ✅ (see Section 6)
- auth.ts: NextAuth v5 fully configured — Google OAuth, token mirror to users table, Gmail watch trigger on sign-in ✅
- lib/db/schema.ts: all 4 tables written (users, meetings, email_drafts, documents) ✅
- lib/logger.ts: Pino + Axiom configured ✅
- lib/ratelimit.ts: Upstash sliding window rate limiter configured ✅
- lib/gmail.ts: audited, type-safe and refactored ✅
- lib/google.ts: audited, auto-refresh active ✅
- drizzle.config.ts: configured, points to DATABASE_URL ✅
- middleware.ts: dashboard routes protected ✅
- sentry.client/server/edge.config.ts: exist ✅
- inngest/client.ts: exists ✅
- inngest/functions/: process-email, renew-gmail-watch Inngest functions written and verified ✅
- app/api/health: exists ✅
- app/api/auth: NextAuth route configured ✅
- app/api/inngest: Inngest route serving all background jobs ✅
- app/api/webhooks/gmail: Google OIDC-verified webhook receiver active ✅
- app/api/gmail/watch: Gmail inbox watch setup route active ✅
- app/page.tsx: landing page complete ✅
- AGENTS.md, GEMINI.md, ARCHITECTURE.md: created in repo root ✅
- Migration: Drizzle migration pushed successfully to Supabase ✅
- Testing & Auditing: Vitest (JSDOM), Playwright E2E, and eslint-plugin-security linter fully configured ✅


════════════════════════════════════════════════════════════════════
SECTION 13 — NEXT 3 TASKS
════════════════════════════════════════════════════════════════════


[ ] 1. Review and Merge Pull Request #1 (Testing Framework and Security Audits) to master.


[ ] 2. Build the Dashboard UI (feat/dashboard-ui branch) containing the DraftCard list and review/approval flows for pending drafts (Week 3 milestone).


[ ] 3. Setup Stripe paywall gating the dashboard behind a $29/month subscription check, and implement the Stripe subscription webhook processor.




════════════════════════════════════════════════════════════════════
SHIPPED LOG
════════════════════════════════════════════════════════════════════


May 28 — Migrated schema to Supabase, audited all OAuth token sync and watch routes.
May 28 — Implemented Gmail Pub/Sub webhook receiver and process-email Inngest job (Week 2 features complete).
May 28 — Configured Vitest unit testing, React Testing Library component tests, Playwright E2E tests, and ESLint security linter.
May 27 — Named product Dealinno, bought domain, set up Vercel
May 27 — Scaffolded Next.js codebase
May 27 — Configured Google Cloud OAuth (branding, scopes, client)
May 27 — Created Gmail Pub/Sub topic
May 27 — Populated .env.local with all available keys
May 27 — Applied for Anthropic for Startups (likely ineligible without VC backing)
May 27 — All npm dependencies installed (full stack: Drizzle, NextAuth v5, Inngest, Stripe, Sentry, Pino, Upstash, Zod, etc.)
May 27 — auth.ts: NextAuth v5 fully configured with Google OAuth, token mirroring, Gmail watch trigger
May 27 — lib/db/schema.ts: all 4 tables written (users, meetings, email_drafts, documents)
May 27 — lib/logger.ts + lib/ratelimit.ts: observability layer configured
May 27 — All env vars populated: DATABASE_URL, SENTRY_DSN, AXIOM_TOKEN, UPSTASH keys
May 27 — AGENTS.md, GEMINI.md, ARCHITECTURE.md created in repo root
May 27 — Google Docs API enabled, Claude Desktop MCP updated to edit this doc in place




════════════════════════════════════════════════════════════════════
RULES FOR USING THIS DOC
════════════════════════════════════════════════════════════════════


For AI coding agents:
- This doc is the ground truth. Do not deviate from the schema, file structure, or data flows
  without updating this doc first.
- When writing any API route, Inngest job, or AI prompt — follow the exact specs in Sections 5-10.
- If something is marked ❌ or ⚠️ in Section 12, fix that before building new features.
- Always use the exact table/column names from Section 4 in any DB query.


For session management:
- Update Section 12 (Current State) and Section 13 (Next 3 Tasks) at the end of every session.
- When a task ships, move it to Shipped Log with the date.
- Keep Next 3 Tasks to exactly 3 items maximum.




════════════════════════════════════════════════════════════════════ SECTION 14 — OBSERVABILITY, SECURITY & CODE STANDARDS ════════════════════════════════════════════════════════════════════
These standards apply to every API route, Inngest job, and external API call. AI agents must follow these rules before writing any feature code.


14.1 — ERROR TRACKING (Sentry) — REQUIRED DAY ONE
Install: npm install @sentry/nextjs then npx @sentry/wizard@latest -i nextjs
Add to .env.local and Vercel: SENTRY_DSN=<dsn from sentry.io>
Every Inngest job MUST wrap logic in try/catch and call Sentry on failure:


import * as Sentry from '@sentry/nextjs'
try {
  // job logic
} catch (error) {
  Sentry.captureException(error, {
    extra: { userId, jobName: 'processEmailEvent', historyId }
  })
  throw error // re-throw so Inngest marks failed and retries
}
	

Every external API call (Gmail, OpenAI, Deepgram, Gemini, Stripe) must be individually wrapped so failures are attributed to the right call.


14.2 — STRUCTURED LOGGING (Pino + Axiom)
Install: npm install pino pino-axiom
Create lib/logger.ts:


import pino from 'pino'
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV === 'production'
    ? { target: 'pino-axiom', options: { token: process.env.AXIOM_TOKEN, dataset: 'dealinno' } }
    : { target: 'pino-pretty' }
})
	

Add to .env.local: AXIOM_TOKEN=<token from axiom.co>
Every API route MUST log at minimum: logger.info({ userId, action, draftId, duration_ms })
Every Inngest job MUST log: start, each step completion, and final status.
NEVER log: access tokens, refresh tokens, email bodies, transcript text, API keys. Log IDs and metadata only.


14.3 — RATE LIMITING (Upstash)
Install: npm install @upstash/ratelimit @upstash/redis
Add to .env.local:


UPSTASH_REDIS_REST_URL=<url from upstash.com>
UPSTASH_REDIS_REST_TOKEN=<token from upstash.com>
	

Create lib/ratelimit.ts:


import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})
	

Apply to ALL API routes. Limits by route:
* /api/webhooks/gmail — 100 req/min per IP
* /api/documents/generate — 5 req/min per userId
* /api/gmail/watch — 3 req/min per userId
* All others — 20 req/min per userId
Pattern:


const { success } = await ratelimit.limit(userId ?? ip)
if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
	



14.4 — INPUT VALIDATION (Zod)
Install: npm install zod
Every API route request body MUST be validated with Zod before touching DB or firing events:


const schema = z.object({
  transcript: z.string().min(100).max(100000),
  doc_type: z.enum(['proposal', 'sow', 'deck']),
  meeting_id: z.string().uuid().optional(),
})
const result = schema.safeParse(await req.json())
if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
	

Every Inngest event payload MUST have a Zod schema alongside the function definition.


14.5 — SECURITY CHECKLIST (per route)
Before any API route is considered complete, verify all of these:
* Auth check: user is signed in (use auth() from NextAuth)
* Authorization: user owns the resource they're accessing
* Rate limiting applied (14.3)
* Input validated with Zod (14.4)
* No sensitive data in response (no tokens, no full email bodies to client)
* Error responses never expose stack traces or internal details
* Webhook routes verify signatures
Stripe webhook signature verification (REQUIRED — without this anyone can fake payment events):


const sig = req.headers.get('stripe-signature')!
const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
	

Gmail Pub/Sub verification: check that the request comes from Google's push notification service by validating the Bearer token in the Authorization header against Google's token info endpoint.


14.6 — UPTIME MONITORING (Betterstack)
Sign up at betterstack.com (free tier). Add a monitor pointing to: https://dealinno.vercel.app/api/health Add a /api/health route that returns 200 + { status: 'ok', timestamp }. Alert: email + SMS if down > 2 minutes.


14.7 — PERFORMANCE (Vercel Analytics)
Enable in Vercel dashboard → Analytics tab.
Add to app/layout.tsx:


import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
// Add <Analytics /> and <SpeedInsights /> inside the body
	



14.8 — DEPENDENCY SECURITY
Run before every deploy: npm audit --audit-level=high
Add to package.json: "precommit": "npm audit --audit-level=high"
Never commit .env.local. It must be in .gitignore. Rotate any key that has been pasted into a chat, email, or public channel immediately.


14.9 — ARCHITECTURE DECISION LOG
Keep ARCHITECTURE.md in the repo root. Every non-obvious technical decision gets one entry.
Format:


## [DATE] — [DECISION TITLE]
Context: why this decision was needed
Decision: what was chosen
Alternatives considered: what else was evaluated
Reason: why this option won
Consequences: what this means going forward
	

Decisions that MUST be logged: why Inngest over direct webhook processing, why GPT-4o mini over Claude for email drafting, why Drizzle over Prisma, any security-relevant choice.


14.10 — ADDITIONAL DEPENDENCIES (add to Section 6 install command)


@sentry/nextjs
pino
pino-axiom
@upstash/ratelimit
@upstash/redis
zod
@vercel/analytics
@vercel/speed-insights
	

Additional env vars needed (add to Section 7):


SENTRY_DSN=<from sentry.io>                    ❌ missing
AXIOM_TOKEN=<from axiom.co>                    ❌ missing
UPSTASH_REDIS_REST_URL=<from upstash.com>      ❌ missing
UPSTASH_REDIS_REST_TOKEN=<from upstash.com>    ❌ missing