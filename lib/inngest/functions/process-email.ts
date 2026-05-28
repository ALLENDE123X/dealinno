import * as Sentry from '@sentry/nextjs'
import { inngest } from '@/inngest/client'
import { db } from '@/lib/db'
import { users, emailDrafts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { getValidAccessToken } from '@/lib/google'
import { getHistory, getMessage, createDraft } from '@/lib/gmail'
import { classifyEmail } from '@/lib/ai/classify-email'
import { draftEmailReply } from '@/lib/ai/draft-email'

export const processEmail = inngest.createFunction(
  { id: 'process-email', triggers: [{ event: 'email/received' }] },
  async ({ event, step }) => {
    const { userId, historyId } = event.data
    logger.info({ userId, historyId, action: 'process_email_start' })

    try {
      // Step 1: Fetch user + refresh token if needed
      const user = await step.run('fetch-user', async () => {
        const u = await db.query.users.findFirst({ where: eq(users.id, userId) })
        if (!u) throw new Error(`User not found: ${userId}`)
        return u
      })

      // Step 2: Get a valid access token (auto-refreshes if expired)
      const accessToken = await step.run('get-access-token', async () => {
        return getValidAccessToken(userId)
      })

      // Step 3: Fetch Gmail history to find new messages since last historyId
      const newMessages = await step.run('fetch-history', async () => {
        if (!user.gmailHistoryId) {
          logger.info({ userId, action: 'process_email', reason: 'no_history_id' })
          return []
        }

        const history = await getHistory(accessToken, user.gmailHistoryId)

        // Update the user's historyId to the new one
        await db.update(users)
          .set({ gmailHistoryId: historyId, updatedAt: new Date() })
          .where(eq(users.id, userId))

        logger.info({ userId, action: 'fetch_history', newMessageCount: history.length })
        return history
      })

      if (newMessages.length === 0) {
        return { status: 'no_new_messages' }
      }

      // Step 4: Process each new message
      const results = await step.run('process-messages', async () => {
        const processed = []

        for (const msg of newMessages) {
          try {
            const fullMessage = await getMessage(accessToken, msg.id)
            if (!fullMessage) continue

            const { subject, from, body, threadId, messageId, toAddresses } = fullMessage

            // Skip emails sent by us
            if (from.includes(user.email ?? '')) continue
            // Skip no-reply, newsletters, etc.
            if (/no.?reply|unsubscribe|newsletter|noreply/i.test(from)) continue

            // Classify the email
            const classification = await classifyEmail(subject, from, body, userId)
            if (!classification || !classification.should_draft) {
              logger.info({ userId, messageId, action: 'skip_email', reason: 'not_actionable' })
              continue
            }

            // Generate draft reply
            const draft = await draftEmailReply(
              { subject, from, body },
              classification,
              { name: user.name ?? 'User', email: user.email ?? '' },
              userId
            )
            if (!draft) continue

            // Create Gmail draft
            const gmailDraft = await createDraft(accessToken, {
              to: toAddresses,
              subject: draft.subject,
              bodyText: draft.body_text,
              bodyHtml: draft.body_html,
              threadId,
            })

            // Save to database
            const [savedDraft] = await db.insert(emailDrafts).values({
              userId,
              gmailThreadId: threadId,
              gmailMessageId: messageId,
              gmailDraftId: gmailDraft?.id ?? null,
              subject: draft.subject,
              toAddresses,
              bodyHtml: draft.body_html,
              bodyText: draft.body_text,
              classification: classification.intent,
              classificationConfidence: classification.confidence,
              keyPoints: classification.key_points,
              status: 'pending_review',
            }).returning()

            logger.info({
              userId,
              draftId: savedDraft.id,
              action: 'email_draft_created',
              intent: classification.intent,
            })

            processed.push({ draftId: savedDraft.id, intent: classification.intent })
          } catch (msgError) {
            // Don't let one message failure kill the whole batch
            Sentry.captureException(msgError, { extra: { userId, msgId: msg.id } })
            logger.error({ userId, msgId: msg.id, action: 'process_message', error: msgError })
          }
        }

        return processed
      })

      logger.info({ userId, action: 'process_email_complete', draftsCreated: results.length })
      return { status: 'complete', draftsCreated: results.length, drafts: results }
    } catch (error) {
      Sentry.captureException(error, { extra: { userId, historyId, jobName: 'processEmail' } })
      logger.error({ userId, historyId, action: 'process_email_error', error })
      throw error // Re-throw so Inngest marks as failed and retries
    }
  }
)

