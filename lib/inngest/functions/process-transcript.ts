import { inngest } from '@/inngest/client'

export const processMeetingTranscript = inngest.createFunction(
  { id: 'process-transcript', triggers: [{ event: 'meeting/transcribed' }] },
  async ({ event, step }) => {
    return { status: 'stub' }
  }
)
