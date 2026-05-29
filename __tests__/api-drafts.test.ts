import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/drafts/[id]/route'
import { auth } from '@/auth'
import { limitRequest } from '@/lib/ratelimit'
import { sendDraft } from '@/lib/gmail'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/ratelimit', () => ({ limitRequest: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => [{
            draft: { userId: 'user-1', gmailDraftId: 'draft-1' },
            user: { googleAccessToken: 'token' }
          }])
        }))
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn()
      }))
    })),
    delete: vi.fn(() => ({
      where: vi.fn()
    }))
  }
}))
vi.mock('@/lib/gmail', () => ({
  sendDraft: vi.fn(),
  deleteDraft: vi.fn(),
  getHistory: vi.fn(),
  getMessage: vi.fn(),
  createDraft: vi.fn()
}))
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))
vi.mock('@sentry/nextjs', () => ({
  Sentry: { captureException: vi.fn() }
}))

describe('PATCH /api/drafts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if unauthorized', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null)
    const req = new Request('http://localhost/api/drafts/1', { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(401)
  })

  it('should return 429 if rate limited', async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as never)
    vi.mocked(limitRequest).mockResolvedValueOnce({ success: false } as never)
    const req = new Request('http://localhost/api/drafts/1', { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(429)
  })

  it('should process approve action successfully', async () => {
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as never)
    vi.mocked(limitRequest).mockResolvedValueOnce({ success: true } as never)
    const req = new Request('http://localhost/api/drafts/1', { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) })
    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(200)
    expect(sendDraft).toHaveBeenCalledWith('token', 'draft-1')
  })
})
