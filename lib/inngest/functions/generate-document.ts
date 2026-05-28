import { inngest } from '@/inngest/client'

export const generateDocument = inngest.createFunction(
  { id: 'generate-document', triggers: [{ event: 'document/generate' }] },
  async ({ event, step }) => {
    return { status: 'stub' }
  }
)
