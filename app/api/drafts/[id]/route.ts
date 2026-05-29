import { auth } from '@/auth'
import { db } from '@/lib/db'
import { emailDrafts, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { limitRequest } from '@/lib/ratelimit'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'
import { sendDraft, deleteDraft } from '@/lib/gmail'
import { z } from 'zod'

const actionSchema = z.object({
  action: z.enum(['approve', 'reject']),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let userId: string | undefined

  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = await limitRequest(session.user.email)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    const { action } = parsed.data

    const userRecords = await db.select().from(users).where(eq(users.email, session.user.email)).limit(1)
    const dbUser = userRecords[0]

    if (!dbUser?.googleAccessToken) {
      return NextResponse.json({ error: 'Google authentication required' }, { status: 403 })
    }
    userId = dbUser.id

    const draftRecords = await db.select().from(emailDrafts).where(eq(emailDrafts.id, id)).limit(1)
    const draft = draftRecords[0]

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    if (draft.userId !== dbUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!draft.gmailDraftId) {
       return NextResponse.json({ error: 'Gmail draft ID missing' }, { status: 400 })
    }

    if (action === 'approve') {
      await sendDraft(dbUser.googleAccessToken, draft.gmailDraftId)
      await db.update(emailDrafts)
        .set({ status: 'sent', updatedAt: new Date() })
        .where(eq(emailDrafts.id, id))
      logger.info({ userId, draftId: id, action }, 'Draft approved and sent')
    } else {
      await deleteDraft(dbUser.googleAccessToken, draft.gmailDraftId)
      await db.update(emailDrafts)
        .set({ status: 'rejected', updatedAt: new Date() })
        .where(eq(emailDrafts.id, id))
      logger.info({ userId, draftId: id, action }, 'Draft rejected and deleted')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    Sentry.captureException(error, { extra: { userId, action: 'patch_draft', draftId: id } })
    logger.error({ error, userId, draftId: id }, 'Failed to process draft action')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
