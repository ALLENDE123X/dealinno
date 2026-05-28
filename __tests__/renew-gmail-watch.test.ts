import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renewGmailWatch } from '@/lib/inngest/functions/renew-gmail-watch'
import { db } from '@/lib/db'
import { watchInbox } from '@/lib/gmail'

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findMany: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}))

vi.mock('@/lib/gmail', () => ({
  watchInbox: vi.fn(),
}))

vi.mock('@/lib/google', () => ({
  getValidAccessToken: vi.fn(() => Promise.resolve('mock-access-token')),
}))

describe('renewGmailWatch Inngest Job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should renew watch for expiring users', async () => {
    const mockExpiringUsers = [
      { id: 'user-1', googleRefreshToken: 'refresh-1', email: 'user1@example.com' }
    ]

    // @ts-expect-error - mock types
    db.query.users.findMany.mockResolvedValueOnce(mockExpiringUsers)
    vi.mocked(watchInbox).mockResolvedValueOnce({
      historyId: 'new-history-1',
      expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })

    // Mock step runners
    const step = {
      run: vi.fn(async (id, callback) => {
        return callback()
      })
    }

    // Call the function directly with mocked context
    // @ts-expect-error - mock step runner
    const result = await renewGmailWatch.fn({ step })

    expect(result.status).toBe('complete')
    expect(result.renewedCount).toBe(1)
    expect(watchInbox).toHaveBeenCalledWith('mock-access-token')
  })
})
