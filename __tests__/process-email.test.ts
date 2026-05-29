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

// Shared helpers
const mockUser = {
  id: 'user-1',
  email: 'user1@example.com',
  name: 'Test User',
  gmailHistoryId: 'history-123',
}

const mockStep = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: vi.fn(async (_id: string, callback: () => any) => {
    return callback()
  }),
}

function setupHappyPath() {
  // @ts-expect-error - mock types
  db.query.users.findFirst.mockResolvedValueOnce(mockUser)

  vi.mocked(getHistory).mockResolvedValueOnce([{ id: 'msg-1' }])

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
    body: 'Test draft body',
    toEmail: 'client@example.com',
  })

  vi.mocked(createDraft).mockResolvedValueOnce({
    id: 'gmail-draft-999',
  })
}

describe('processEmail Inngest Job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch new emails, classify, draft, and save to DB', async () => {
    setupHappyPath()

    // @ts-expect-error - mock types
    const result = await processEmail.fn({
      event: { data: { userId: 'user-1', historyId: 'history-124' } },
      step: mockStep,
    })

    expect(result.status).toBe('complete')
    expect(result.draftsCreated).toBe(1)
    expect(getHistory).toHaveBeenCalledWith('mock-access-token', 'history-123')
    expect(classifyEmail).toHaveBeenCalled()
  })

  it('should pass draft.toEmail and inReplyTo to createDraft', async () => {
    setupHappyPath()

    // @ts-expect-error - mock types
    await processEmail.fn({
      event: { data: { userId: 'user-1', historyId: 'history-124' } },
      step: mockStep,
    })

    expect(createDraft).toHaveBeenCalledWith('mock-access-token', expect.objectContaining({
      to: ['client@example.com'],
      subject: 'Re: Meeting follow up',
      inReplyTo: 'msg-1',
      threadId: 'thread-1',
    }))
  })

  it('should save draft.toEmail as toAddresses in the database', async () => {
    setupHappyPath()

    // @ts-expect-error - mock types
    await processEmail.fn({
      event: { data: { userId: 'user-1', historyId: 'history-124' } },
      step: mockStep,
    })

    expect(db.insert).toHaveBeenCalled()
    const insertCall = vi.mocked(db.insert).mock.results[0]
    // The chain is db.insert(emailDrafts).values({...}).returning()
    // We verify the values mock was called with correct toAddresses
    const valuesCall = insertCall.value.values as ReturnType<typeof vi.fn>
    expect(valuesCall).toHaveBeenCalledWith(expect.objectContaining({
      toAddresses: ['client@example.com'],
      gmailDraftId: 'gmail-draft-999',
      gmailMessageId: 'msg-1',
      gmailThreadId: 'thread-1',
      status: 'pending_review',
    }))
  })

  it('should skip emails sent by the user themselves', async () => {
    // @ts-expect-error - mock types
    db.query.users.findFirst.mockResolvedValueOnce(mockUser)
    vi.mocked(getHistory).mockResolvedValueOnce([{ id: 'msg-1' }])
    vi.mocked(getMessage).mockResolvedValueOnce({
      messageId: 'msg-1',
      threadId: 'thread-1',
      subject: 'My own email',
      from: 'user1@example.com', // same as user's email
      toAddresses: ['someone@example.com'],
      body: 'I sent this.',
    })

    // @ts-expect-error - mock types
    const result = await processEmail.fn({
      event: { data: { userId: 'user-1', historyId: 'history-124' } },
      step: mockStep,
    })

    expect(result.status).toBe('complete')
    expect(result.draftsCreated).toBe(0)
    expect(classifyEmail).not.toHaveBeenCalled()
  })

  it('should skip no-reply and newsletter emails', async () => {
    // @ts-expect-error - mock types
    db.query.users.findFirst.mockResolvedValueOnce(mockUser)
    vi.mocked(getHistory).mockResolvedValueOnce([{ id: 'msg-1' }])
    vi.mocked(getMessage).mockResolvedValueOnce({
      messageId: 'msg-1',
      threadId: 'thread-1',
      subject: 'Newsletter',
      from: 'noreply@example.com',
      toAddresses: ['user1@example.com'],
      body: 'Weekly newsletter content.',
    })

    // @ts-expect-error - mock types
    const result = await processEmail.fn({
      event: { data: { userId: 'user-1', historyId: 'history-124' } },
      step: mockStep,
    })

    expect(result.status).toBe('complete')
    expect(result.draftsCreated).toBe(0)
    expect(classifyEmail).not.toHaveBeenCalled()
  })

  it('should skip emails classified as non-scheduling', async () => {
    // @ts-expect-error - mock types
    db.query.users.findFirst.mockResolvedValueOnce(mockUser)
    vi.mocked(getHistory).mockResolvedValueOnce([{ id: 'msg-1' }])
    vi.mocked(getMessage).mockResolvedValueOnce({
      messageId: 'msg-1',
      threadId: 'thread-1',
      subject: 'Random email',
      from: 'someone@example.com',
      toAddresses: ['user1@example.com'],
      body: 'Just saying hello.',
    })
    vi.mocked(classifyEmail).mockResolvedValueOnce({
      isSchedulingEmail: false,
      emailType: 'other',
      confidence: 'low',
      reasoning: 'Not scheduling related',
    })

    // @ts-expect-error - mock types
    const result = await processEmail.fn({
      event: { data: { userId: 'user-1', historyId: 'history-124' } },
      step: mockStep,
    })

    expect(result.status).toBe('complete')
    expect(result.draftsCreated).toBe(0)
    expect(draftEmailReply).not.toHaveBeenCalled()
    expect(createDraft).not.toHaveBeenCalled()
  })

  it('should return no_new_messages when history is empty', async () => {
    // @ts-expect-error - mock types
    db.query.users.findFirst.mockResolvedValueOnce(mockUser)
    vi.mocked(getHistory).mockResolvedValueOnce([])

    // @ts-expect-error - mock types
    const result = await processEmail.fn({
      event: { data: { userId: 'user-1', historyId: 'history-124' } },
      step: mockStep,
    })

    expect(result.status).toBe('no_new_messages')
    expect(getMessage).not.toHaveBeenCalled()
  })

  it('should not kill the batch when one message fails', async () => {
    // @ts-expect-error - mock types
    db.query.users.findFirst.mockResolvedValueOnce(mockUser)
    vi.mocked(getHistory).mockResolvedValueOnce([
      { id: 'msg-bad' },
      { id: 'msg-good' },
    ])

    // First message: getMessage throws
    vi.mocked(getMessage)
      .mockRejectedValueOnce(new Error('API error'))
      // Second message: succeeds
      .mockResolvedValueOnce({
        messageId: 'msg-good',
        threadId: 'thread-2',
        subject: 'Good email',
        from: 'client2@example.com',
        toAddresses: ['user1@example.com'],
        body: 'Let\'s meet next week.',
      })

    vi.mocked(classifyEmail).mockResolvedValueOnce({
      isSchedulingEmail: true,
      emailType: 'scheduling',
      confidence: 'high',
      reasoning: 'Wants to meet',
    })

    vi.mocked(draftEmailReply).mockResolvedValueOnce({
      subject: 'Re: Good email',
      body: 'Sounds good',
      toEmail: 'client2@example.com',
    })

    vi.mocked(createDraft).mockResolvedValueOnce({
      id: 'gmail-draft-777',
    })

    // @ts-expect-error - mock types
    const result = await processEmail.fn({
      event: { data: { userId: 'user-1', historyId: 'history-124' } },
      step: mockStep,
    })

    // The batch should still complete with the good message
    expect(result.status).toBe('complete')
    expect(result.draftsCreated).toBe(1)
  })
})
