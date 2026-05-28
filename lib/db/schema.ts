import { pgTable, uuid, text, timestamp, doublePrecision, jsonb } from 'drizzle-orm/pg-core'

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: timestamp('google_token_expiry', { withTimezone: true }),
  gmailWatchExpiration: timestamp('gmail_watch_expiration', { withTimezone: true }),
  gmailHistoryId: text('gmail_history_id'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripeSubscriptionStatus: text('stripe_subscription_status'), // 'active' | 'canceled' | 'past_due' | 'trialing'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// 2. Meetings Table
export const meetings = pgTable('meetings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  googleEventId: text('google_event_id').notNull(),
  title: text('title'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  attendees: jsonb('attendees'), // [{ name: string, email: string }]
  transcriptRaw: text('transcript_raw'),
  transcriptText: text('transcript_text'),
  transcriptSummary: text('transcript_summary'),
  status: text('status').default('scheduled').notNull(), // 'scheduled' | 'recording' | 'transcribed' | 'processed' | 'error'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// 3. Email Drafts Table
export const emailDrafts = pgTable('email_drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'set null' }),
  gmailThreadId: text('gmail_thread_id').notNull(),
  gmailMessageId: text('gmail_message_id').notNull(),
  gmailDraftId: text('gmail_draft_id'),
  subject: text('subject').notNull(),
  toAddresses: text('to_addresses').array().notNull(), // text[]
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text').notNull(),
  classification: text('classification').notNull(), // 'scheduling' | 'follow_up' | 'proposal_request' | 'check_in'
  classificationConfidence: doublePrecision('classification_confidence').notNull(),
  keyPoints: text('key_points').array(), // text[]
  status: text('status').default('pending_review').notNull(), // 'pending_review' | 'approved' | 'sent' | 'rejected' | 'error'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// 4. Documents Table
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'set null' }),
  emailDraftId: uuid('email_draft_id').references(() => emailDrafts.id, { onDelete: 'set null' }),
  docType: text('doc_type').notNull(), // 'proposal' | 'sow' | 'deck' | 'follow_up_email'
  title: text('title').notNull(),
  contentJson: jsonb('content_json'), // structured JSON content
  filePath: text('file_path'),
  fileUrl: text('file_url'),
  googleDriveFileId: text('google_drive_file_id'),
  status: text('status').default('generating').notNull(), // 'generating' | 'complete' | 'failed'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
