import { auth } from '@/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { watchInbox } from '@/lib/gmail'
import { getValidAccessToken } from '@/lib/google'
import { logger } from '@/lib/logger'
import { limitRequest } from '@/lib/ratelimit'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // 1. Rate limiting
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { success } = await limitRequest(`watch_${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // 2. Auth check
  let userEmail: string | null = null
  const session = await auth()

  if (session?.user?.email) {
    userEmail = session.user.email
  } else {
    // Fallback for internal oauth callback trigger (signIn callback)
    const headerEmail = req.headers.get('x-user-email')
    const host = req.headers.get('host')
    const isInternal = host?.includes('localhost') || host?.includes('dealinno')

    if (headerEmail && isInternal) {
      userEmail = headerEmail
    }
  }

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch user from DB
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    })

    if (!user) {
      logger.error({ email: userEmail }, 'User not found in DB during watch setup')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get fresh access token (or refresh if expired)
    const accessToken = await getValidAccessToken(user.id)

    // Register watch with Google Gmail API
    const watchResult = await watchInbox(accessToken)

    if (!watchResult || !watchResult.historyId) {
      throw new Error('Invalid watch response: historyId is missing')
    }

    const expiration = watchResult.expiration
      ? new Date(parseInt(watchResult.expiration))
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Update user record in DB
    await db.update(users)
      .set({
        gmailHistoryId: watchResult.historyId,
        gmailWatchExpiration: expiration,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    logger.info({ userId: user.id, historyId: watchResult.historyId }, 'Gmail watch registration complete')

    return NextResponse.json({
      success: true,
      historyId: watchResult.historyId,
      expiration: expiration.toISOString(),
    })
  } catch (error) {
    logger.error({ error, email: userEmail }, 'Failed to register Gmail watch')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
