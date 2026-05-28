import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/drive.file',
          ].join(' '),
          access_type: 'offline', // REQUIRED to get refresh_token
          prompt: 'consent', // REQUIRED to always get refresh_token on sign-in
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.access_token && user.email) {
        try {
          // Mirror credentials/tokens into users table for background server API tasks
          await db.update(users)
            .set({
              googleAccessToken: account.access_token,
              googleRefreshToken: account.refresh_token,
              googleTokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : null,
              updatedAt: new Date(),
            })
            .where(eq(users.email, user.email))

          // Trigger Gmail inbox watch setup via absolute URL
          const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          
          // Make asynchronous trigger call without blocking the sign-in redirect
          fetch(`${appUrl}/api/gmail/watch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-email': user.email,
            },
          }).catch((err) => {
            logger.error({ err }, 'Failed to trigger Gmail watch async call')
          })

          logger.info({ email: user.email }, 'User successfully signed in and tokens synced')
        } catch (error) {
          logger.error({ error, email: user.email }, 'Failed to sync Google OAuth tokens to users table')
        }
      }
      return true
    },
  },
})
