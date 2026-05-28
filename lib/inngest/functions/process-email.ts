import { inngest } from '@/inngest/client'

export const processEmail = inngest.createFunction(
  { id: 'process-email', triggers: [{ event: 'email/received' }] },
  async ({ event, step }) => {
    return { status: 'stub' }
  }
)
