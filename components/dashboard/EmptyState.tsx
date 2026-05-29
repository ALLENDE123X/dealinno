import { Card, CardContent } from '@/components/ui/card'

export function EmptyState() {
  return (
    <Card className="w-full max-w-2xl py-12 text-center border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center space-y-3 pt-6">
        <h3 className="text-lg font-medium text-gray-900">No pending drafts</h3>
        <p className="text-sm text-gray-500">
          When you have meetings, your AI-generated drafts will appear here for review.
        </p>
      </CardContent>
    </Card>
  )
}
