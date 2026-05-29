import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classifyEmail } from '@/lib/ai/classify-email'

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

describe('classifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should correctly parse and validate a scheduling email', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              isSchedulingEmail: true,
              emailType: 'meeting_request',
              confidence: 'high',
              reasoning: 'The user is asking for a time to meet next week.',
            }),
          },
        },
      ],
    })

    const result = await classifyEmail('Can we meet next Tuesday at 10 AM?', 'user-123')

    expect(result).toEqual({
      isSchedulingEmail: true,
      emailType: 'meeting_request',
      confidence: 'high',
      reasoning: 'The user is asking for a time to meet next week.',
    })
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('should throw an error if the model returns invalid JSON format', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              isSchedulingEmail: 'yes', // Invalid type, should be boolean
              emailType: 'meeting_request',
              confidence: 'high',
              reasoning: 'Testing invalid type.',
            }),
          },
        },
      ],
    })

    await expect(classifyEmail('Let us meet', 'user-123')).rejects.toThrow()
  })
})
