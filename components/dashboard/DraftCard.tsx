'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function DraftCard({ draft }: { draft: any }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleAction(action: 'approve' | 'reject') {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Action failed')
      }
      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(`Failed to ${action} draft: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mb-4" data-testid="draft-card">
      <CardHeader>
        <CardTitle className="text-lg">{draft.subject}</CardTitle>
        <div className="text-sm text-gray-500" data-testid="draft-to">To: {draft.toAddresses.join(', ')}</div>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-gray-50 rounded-md text-sm whitespace-pre-wrap font-mono text-gray-700 max-h-60 overflow-y-auto border border-gray-200">
          {draft.bodyText}
        </div>
      </CardContent>
      <CardFooter className="flex gap-4 justify-end">
        <Button
          variant="destructive"
          onClick={() => handleAction('reject')}
          disabled={isLoading}
          data-testid="reject-btn"
        >
          Reject
        </Button>
        <Button
          onClick={() => handleAction('approve')}
          disabled={isLoading}
          data-testid="approve-btn"
        >
          Approve & Send
        </Button>
      </CardFooter>
    </Card>
  )
}
