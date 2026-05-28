import * as Sentry from '@sentry/nextjs'
import { inngest } from '@/inngest/client'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { lte, or, isNull, eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { getValidAccessToken } from '@/lib/google'
import { watchInbox } from '@/lib/gmail'

export const renewGmailWatch = inngest.createFunction(
  { id: 'renew-gmail-watch', triggers: [{ cron: '0 0 * * *' }] },
  async ({ step }) => {
    logger.info({ action: 'renew_gmail_watch_start' })

    try {
      // Find users whose watch is expiring in next 48 hours, or doesn't exist
      const threshold = new Date(Date.now() + 48 * 60 * 60 * 1000)

      const expiringUsers = await step.run('find-expiring-users', async () => {
        return db.query.users.findMany({
          where: or(
            lte(users.gmailWatchExpiration, threshold),
            isNull(users.gmailWatchExpiration)
          ),
        })
      })

      logger.info({ action: 'renew_gmail_watch', count: expiringUsers.length })

      const results: Array<{ userId: string; status: string }> = []
      for (const user of expiringUsers) {
        if (!user.googleRefreshToken) continue

        try {
          await step.run(`renew-user-${user.id}`, async () => {
            const accessToken = await getValidAccessToken(user.id)
            const watchResult = await watchInbox(accessToken)

            const expiration = watchResult.expiration
              ? new Date(parseInt(watchResult.expiration))
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

            await db.update(users)
              .set({
                gmailHistoryId: watchResult.historyId,
                gmailWatchExpiration: expiration,
                updatedAt: new Date(),
              })
              .where(eq(users.id, user.id))

            logger.info({ userId: user.id, action: 'renew_gmail_watch_user_success' })
            results.push({ userId: user.id, status: 'renewed' })
          })
        } catch (err) {
          Sentry.captureException(err, { extra: { userId: user.id, action: 'renew_gmail_watch_user' } })
          logger.error({ userId: user.id, action: 'renew_gmail_watch_user_failed', error: err })
        }
      }

      return { status: 'complete', renewedCount: results.length, renewed: results }
    } catch (error) {
      Sentry.captureException(error, { extra: { jobName: 'renewGmailWatch' } })
      logger.error({ action: 'renew_gmail_watch_failed', error })
      throw error
    }
  }
)

