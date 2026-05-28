import OpenAI from 'openai'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const openai = new OpenAI()

export const EmailClassificationSchema = z.object({
  isSchedulingEmail: z.boolean(),
  emailType: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string()
})

export type EmailClassification = z.infer<typeof EmailClassificationSchema>

export async function classifyEmail(
  emailBody: string,
  userId: string
): Promise<EmailClassification> {
  const start = Date.now()

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that classifies whether an email is related to scheduling or managing a sales meeting.
You must return a JSON object with the following fields:
- isSchedulingEmail: boolean (true if it's a meeting request, follow-up, reschedule, cancellation, or anything requiring a calendar event or proposal)
- emailType: string (a short descriptor like "meeting_request", "reschedule", "follow_up", "irrelevant", etc.)
- confidence: "high", "medium", or "low"
- reasoning: string (a short explanation of your reasoning)

Output ONLY valid JSON matching this schema.`
        },
        {
          role: 'user',
          content: `Email Content:\n\n${emailBody}`
        }
      ],
      temperature: 0.1,
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error('Empty response from OpenAI')

    const result = EmailClassificationSchema.parse(JSON.parse(raw))

    logger.info({
      userId,
      action: 'classify_email',
      isSchedulingEmail: result.isSchedulingEmail,
      emailType: result.emailType,
      confidence: result.confidence,
      duration_ms: Date.now() - start,
    })

    return result
  } catch (error) {
    logger.error({
      userId,
      action: 'classify_email_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - start
    })
    throw error
  }
}
