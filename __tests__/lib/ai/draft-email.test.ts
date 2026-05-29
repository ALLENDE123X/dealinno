import { describe, it, expect, vi, beforeEach } from 'vitest'
import { draftEmailReply } from '@/lib/ai/draft-email'
import type { EmailClassification } from '@/lib/ai/classify-email'

// Mock the logger to avoid polluting test output
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}))

vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: mockCreate,
        },
      }
    },
  }
})

describe('draftEmailReply', () => {
  const originalEmail = {
    subject: 'Meeting next week',
    from: 'client@example.com',
    body: 'Can we meet next Tuesday at 10 AM?'
  }

  const classification: EmailClassification = {
    isSchedulingEmail: true,
    emailType: 'meeting_request',
    confidence: 'high',
    reasoning: 'Requesting a meeting time'
  }

  const user = {
    name: 'Alice Sales',
    email: 'alice@dealinno.com'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should correctly parse and validate a drafted email reply', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              subject: 'Re: Meeting next week',
              body: 'Yes, next Tuesday at 10 AM works perfectly. See you then.',
              toEmail: 'client@example.com'
            }),
          },
        },
      ],
    })

    const result = await draftEmailReply(originalEmail, classification, user, 'user-123')

    expect(result).toEqual({
      subject: 'Re: Meeting next week',
      body: 'Yes, next Tuesday at 10 AM works perfectly. See you then.',
      toEmail: 'client@example.com'
    })
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('should throw an error if the model returns invalid JSON format', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              subject: 'Re: Meeting next week',
              body: 'Sure!',
              toEmail: 123 // Invalid type, should be string
            }),
          },
        },
      ],
    })

    await expect(draftEmailReply(originalEmail, classification, user, 'user-123')).rejects.toThrow()
  })
})
