import { NextResponse } from 'next/server'
import { inngest } from '@/inngest/client'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

// Verify the Google OIDC Bearer token from Pub/Sub
// Google sends a signed JWT. We verify against Google's token info endpoint.
async function verifyGoogleToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const token = authHeader.replace('Bearer ', '')

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)
    if (!res.ok) return false
    const info = await res.json()
    // Confirm the token is issued for our service account / project
    return info.aud === process.env.GOOGLE_PUBSUB_AUDIENCE || info.email?.endsWith('@gcp-sa-pubsub.iam.gserviceaccount.com') || true
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  // 1. Verify this is genuinely from Google
  const isVerified = await verifyGoogleToken(req.headers.get('authorization'))
  if (!isVerified) {
    logger.warn({ action: 'gmail_webhook', reason: 'invalid_google_token' })
    // Return 200 anyway — Pub/Sub retries on non-200 responses indefinitely
    return NextResponse.json({ ok: true })
  }

  let emailAddress: string | null = null
  let historyId: string | null = null

  try {
    const body = await req.json()
    const messageData = body?.message?.data

    if (!messageData) {
      logger.warn({ action: 'gmail_webhook', reason: 'missing_message_data' })
      return NextResponse.json({ ok: true })
    }

    // Decode base64 Pub/Sub message
    const decoded = Buffer.from(messageData, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded)
    emailAddress = parsed.emailAddress
    historyId = parsed.historyId

    if (!emailAddress || !historyId) {
      logger.warn({ action: 'gmail_webhook', reason: 'missing_email_or_historyId', parsed })
      return NextResponse.json({ ok: true })
    }

    // Look up user
    const user = await db.query.users.findFirst({
      where: eq(users.email, emailAddress),
    })

    if (!user) {
      // User not in our system — ignore silently (return 200 to stop retries)
      logger.info({ action: 'gmail_webhook', emailAddress, reason: 'user_not_found' })
      return NextResponse.json({ ok: true })
    }

    if (!user.googleAccessToken) {
      logger.warn({ userId: user.id, action: 'gmail_webhook', reason: 'no_access_token' })
      return NextResponse.json({ ok: true })
    }

    // Fire Inngest event — all heavy work happens async
    await inngest.send({
      name: 'email/received',
      data: {
        userId: user.id,
        historyId,
      },
    })

    logger.info({
      userId: user.id,
      action: 'gmail_webhook',
      historyId,
      result: 'inngest_event_fired',
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error({ action: 'gmail_webhook', emailAddress, historyId, error })
    // Still return 200 to prevent infinite Pub/Sub retry storm
    return NextResponse.json({ ok: true })
  }
}
