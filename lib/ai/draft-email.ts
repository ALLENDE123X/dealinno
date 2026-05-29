import OpenAI from 'openai'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'
import type { EmailClassification } from './classify-email'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_for_build' })

export const DraftEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  toEmail: z.string()
})

export type DraftResult = z.infer<typeof DraftEmailSchema>

export async function draftEmailReply(
  originalEmail: { subject: string; from: string; body: string },
  classification: EmailClassification,
  user: { name: string; email: string },
  userId: string
): Promise<DraftResult> {
  const start = Date.now()

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a senior sales assistant for ${user.name}. Write email replies in their voice — direct, confident, first-person, no fluff.

Rules:
- Never mention AI or that you're an assistant
- Never use "I hope this email finds you well", "Please don't hesitate", "Best regards" clichés  
- Match the suggested tone exactly (default to confident if unsure)
- Keep it concise — under 150 words unless the situation demands more
- Sound human and specific, not templated

Return this exact JSON shape:
{
  "subject": "Re: [original subject]",
  "body": "plain text email body only, no greeting header",
  "toEmail": "the email address of the original sender you are replying to"
}`
        },
        {
          role: 'user',
          content: `Original email:
From: ${originalEmail.from}
Subject: ${originalEmail.subject}
Body: ${originalEmail.body}

Classification:
- Intent: ${classification.emailType}
- Confidence: ${classification.confidence}
- Reasoning: ${classification.reasoning}
- My name: ${user.name}`
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error('Empty response from OpenAI')

    const result = DraftEmailSchema.parse(JSON.parse(raw))

    logger.info({
      userId,
      action: 'draft_email',
      intent: classification.emailType,
      duration_ms: Date.now() - start,
    })

    return result
  } catch (error) {
    Sentry.captureException(error, { extra: { userId, action: 'draft_email' } })
    logger.error({
      userId,
      action: 'draft_email_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - start
    })
    throw error
  }
}
