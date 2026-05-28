import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/webhooks/gmail/route'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

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
  },
}))

vi.mock('@/inngest/client', () => ({
  inngest: {
    send: vi.fn(),
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Gmail Webhook POST handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 with ok: true on unverified token', async () => {
    const req = new Request('http://localhost/api/webhooks/gmail', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer invalid-token'
      }
    })
    mockFetch.mockResolvedValueOnce({
      ok: false
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true })
  })

  it('should trigger inngest when user is found and token verified', async () => {
    const mockUser = {
      id: 'user-id-123',
      email: 'user@example.com',
      googleAccessToken: 'token-abc'
    }
    // @ts-expect-error - Ignore type differences for simple mock
    db.query.users.findFirst.mockResolvedValueOnce(mockUser)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        aud: process.env.GOOGLE_PUBSUB_AUDIENCE || 'test-audience',
        email: 'some-sa@gcp-sa-pubsub.iam.gserviceaccount.com'
      })
    })

    // Encode standard Pub/Sub envelope
    const dataObj = {
      emailAddress: 'user@example.com',
      historyId: '987654'
    }
    const messageBase64 = Buffer.from(JSON.stringify(dataObj)).toString('base64')
    const req = new Request('http://localhost/api/webhooks/gmail', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer valid-token'
      },
      body: JSON.stringify({
        message: {
          data: messageBase64
        }
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true })

    expect(inngest.send).toHaveBeenCalledWith({
      name: 'email/received',
      data: {
        userId: 'user-id-123',
        historyId: '987654',
      }
    })
  })
})
