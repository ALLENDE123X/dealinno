import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processEmail } from '@/lib/inngest/functions/process-email'
import { db } from '@/lib/db'
import { getHistory, getMessage, createDraft } from '@/lib/gmail'
import { classifyEmail } from '@/lib/ai/classify-email'
import { draftEmailReply } from '@/lib/ai/draft-email'

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => [{ id: 'mock-draft-1' }]),
      })),
    })),
  },
}))

vi.mock('@/lib/gmail', () => ({
  getHistory: vi.fn(),
  getMessage: vi.fn(),
  createDraft: vi.fn(),
}))

vi.mock('@/lib/google', () => ({
  getValidAccessToken: vi.fn(() => Promise.resolve('mock-access-token')),
}))

vi.mock('@/lib/ai/classify-email', () => ({
  classifyEmail: vi.fn(),
}))

vi.mock('@/lib/ai/draft-email', () => ({
  draftEmailReply: vi.fn(),
}))

describe('processEmail Inngest Job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch new emails, classify, draft, and save to DB', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user1@example.com',
      gmailHistoryId: 'history-123',
    }
    // @ts-expect-error - mock types
    db.query.users.findFirst.mockResolvedValueOnce(mockUser)

    vi.mocked(getHistory).mockResolvedValueOnce([
      { id: 'msg-1' }
    ])

    vi.mocked(getMessage).mockResolvedValueOnce({
      messageId: 'msg-1',
      threadId: 'thread-1',
      subject: 'Meeting follow up',
      from: 'client@example.com',
      toAddresses: ['user1@example.com'],
      body: 'Hi, let\'s schedule a call tomorrow.',
    })

    vi.mocked(classifyEmail).mockResolvedValueOnce({
      isSchedulingEmail: true,
      emailType: 'scheduling',
      confidence: 'high',
      reasoning: 'Schedule call tomorrow',
    })

    vi.mocked(draftEmailReply).mockResolvedValueOnce({
      subject: 'Re: Meeting follow up',
      body: 'Hi, sure! Tomorrow at 2pm works.',
      toEmail: 'client@example.com'
    })

    vi.mocked(createDraft).mockResolvedValueOnce({
      id: 'gmail-draft-999',
    })

    const step = {
      run: vi.fn(async (id, callback) => {
        return callback()
      })
    }

    // @ts-expect-error - mock types
    const result = await processEmail.fn({
      event: { data: { userId: 'user-1', historyId: 'history-124' } },
      step,
    })

    expect(result.status).toBe('complete')
    expect(result.draftsCreated).toBe(1)
    expect(getHistory).toHaveBeenCalledWith('mock-access-token', 'history-123')
    expect(classifyEmail).toHaveBeenCalled()
    expect(createDraft).toHaveBeenCalled()
  })
})
