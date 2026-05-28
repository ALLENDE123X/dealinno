import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { processEmail } from '@/lib/inngest/functions/process-email'
import { generateDocument } from '@/lib/inngest/functions/generate-document'
import { processMeetingTranscript } from '@/lib/inngest/functions/process-transcript'
import { renewGmailWatch } from '@/lib/inngest/functions/renew-gmail-watch'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processEmail,
    generateDocument,
    processMeetingTranscript,
    renewGmailWatch,
  ],
})
