import OpenAI from 'openai'
import { logger } from '@/lib/logger'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface EmailClassification {
  should_draft: boolean
  intent: 'scheduling' | 'follow_up' | 'proposal_request' | 'check_in' | 'other'
  confidence: number
  key_points: string[]
  suggested_tone: 'formal' | 'casual' | 'direct'
}

export async function classifyEmail(
  subject: string,
  from: string,
  body: string,
  userId: string
): Promise<EmailClassification | null> {
  const start = Date.now()

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an email classifier for a sales professional. Analyze the email and return JSON only.
Classify the intent and determine if a reply should be drafted.

Rules:
- If confidence < 0.65 → set should_draft = false
- If intent = "other" → set should_draft = false
- Never draft replies to newsletters, marketing emails, or no-reply addresses
- Never draft replies to emails the user sent themselves

Return this exact JSON shape:
{
  "should_draft": boolean,
  "intent": "scheduling" | "follow_up" | "proposal_request" | "check_in" | "other",
  "confidence": number between 0.0 and 1.0,
  "key_points": ["2-4 key points from the email"],
  "suggested_tone": "formal" | "casual" | "direct"
}`,
        },
        {
          role: 'user',
          content: `From: ${from}\nSubject: ${subject}\n\n${body}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error('Empty response from OpenAI')

    const result = JSON.parse(raw) as EmailClassification

    // Enforce rules in case model doesn't comply
    if (result.confidence < 0.65 || result.intent === 'other') {
      result.should_draft = false
    }

    logger.info({
      userId,
      action: 'classify_email',
      intent: result.intent,
      should_draft: result.should_draft,
      confidence: result.confidence,
      duration_ms: Date.now() - start,
    })

    return result
  } catch (error) {
    logger.error({ userId, action: 'classify_email', error, duration_ms: Date.now() - start })
    return null
  }
}
