import { db } from './db'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'
import { logger } from './logger'

export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    throw new Error(`User ${userId} not found`)
  }

  if (!user.googleRefreshToken) {
    throw new Error(`No refresh token found for user ${userId}`)
  }

  // Check if token is expired or expires in the next 5 minutes
  const bufferTime = 5 * 60 * 1000 // 5 minutes
  const isExpired = user.googleTokenExpiry
    ? new Date(user.googleTokenExpiry.getTime() - bufferTime) <= new Date()
    : true

  if (!isExpired && user.googleAccessToken) {
    return user.googleAccessToken
  }

  logger.info({ userId }, 'Refreshing Google OAuth access token')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: user.googleRefreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error({ userId, errorBody }, 'Failed to refresh Google OAuth token')
    throw new Error(`Google token refresh failed: ${errorBody}`)
  }

  const data = await response.json()
  const newAccessToken = data.access_token
  const newExpiry = new Date(Date.now() + data.expires_in * 1000)

  // Save back to DB
  await db.update(users)
    .set({
      googleAccessToken: newAccessToken,
      googleTokenExpiry: newExpiry,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  logger.info({ userId }, 'Google OAuth access token successfully refreshed')
  return newAccessToken
}
