import { auth } from '@/auth'
import { db } from '@/lib/db'
import { emailDrafts, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { DraftCard } from '@/components/dashboard/DraftCard'
import { EmptyState } from '@/components/dashboard/EmptyState'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect('/')
  }

  const userRecords = await db.select().from(users).where(eq(users.email, session.user.email)).limit(1)
  const dbUser = userRecords[0]

  if (!dbUser) {
    redirect('/')
  }

  const drafts = await db.select().from(emailDrafts).where(
    and(
      eq(emailDrafts.userId, dbUser.id),
      eq(emailDrafts.status, 'pending_review')
    )
  )

  return (
    <div className="container max-w-4xl py-8 mx-auto space-y-8 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Review Drafts</h1>
        <p className="text-gray-500 text-lg">Approve emails to send them via your Gmail account.</p>
      </div>

      <div className="space-y-4">
        {drafts.length === 0 ? (
          <EmptyState />
        ) : (
          drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} />
          ))
        )}
      </div>
    </div>
  )
}
