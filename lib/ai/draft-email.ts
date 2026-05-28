import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import type { EmailClassification } from './classify-email'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build' })

export interface DraftResult {
  subject: string
  body_text: string
  body_html: string
}

export async function draftEmailReply(
  originalEmail: { subject: string; from: string; body: string },
  classification: EmailClassification,
  user: { name: string; email: string },
  userId: string
): Promise<DraftResult | null> {
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
- Match the suggested tone exactly
- Reply only with the email body, not subject
- Keep it concise — under 150 words unless the situation demands more
- Sound human and specific, not templated

Return this exact JSON:
{
  "subject": "Re: [original subject with Re: prefix]",
  "body_text": "plain text email body only, no greeting header",
  "body_html": "same content as HTML with <p> tags"
}`,
        },
        {
          role: 'user',
          content: `Original email:
From: ${originalEmail.from}
Subject: ${originalEmail.subject}
Body: ${originalEmail.body}

Classification:
- Intent: ${classification.emailType}
- Reasoning: ${classification.reasoning}
- Confidence: ${classification.confidence}
- My name: ${user.name}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error('Empty response from OpenAI')

    const result = JSON.parse(raw) as DraftResult

    logger.info({
      userId,
      action: 'draft_email',
      intent: classification.emailType,
      duration_ms: Date.now() - start,
    })

    return result
  } catch (error) {
    logger.error({ userId, action: 'draft_email', error, duration_ms: Date.now() - start })
    return null
  }
}
