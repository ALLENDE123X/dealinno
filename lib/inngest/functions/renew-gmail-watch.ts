import { inngest } from '@/inngest/client'

export const renewGmailWatch = inngest.createFunction(
  { id: 'renew-gmail-watch', triggers: [{ cron: '0 0 * * *' }] },
  async ({ step }) => {
    return { status: 'stub' }
  }
)
