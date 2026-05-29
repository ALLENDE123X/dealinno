import { test, expect } from '@playwright/test'
import { db } from '../../lib/db/index'
import { emailDrafts, users } from '../../lib/db/schema'
import { eq } from 'drizzle-orm'

test.describe('Dashboard Draft Approval Flow', () => {
  let testUserId: string
  let draftId: string

  test.beforeAll(async () => {
    // Find an existing user to tie the draft to
    const existingUsers = await db.select().from(users).limit(1)
    if (existingUsers.length > 0) {
      testUserId = existingUsers[0].id
    } else {
      const inserted = await db.insert(users).values({ email: 'e2e-test@example.com' }).returning()
      testUserId = inserted[0].id
    }
  })

  test.beforeEach(async () => {
    // Stub a pending_review row
    const insertedDraft = await db.insert(emailDrafts).values({
      userId: testUserId,
      gmailThreadId: 'e2e_thread',
      gmailMessageId: 'e2e_msg',
      gmailDraftId: 'e2e_draft',
      subject: 'E2E Test Subject',
      toAddresses: ['e2e@example.com'],
      bodyHtml: '<p>E2E Body</p>',
      bodyText: 'E2E Body',
      classification: 'follow_up',
      classificationConfidence: 0.99,
      status: 'pending_review'
    }).returning()
    
    draftId = insertedDraft[0].id
  })

  test.afterEach(async () => {
    // Clean up stubbed row
    if (draftId) {
      await db.delete(emailDrafts).where(eq(emailDrafts.id, draftId))
    }
  })

  test('assert card appears, click approve, assert status changes', async ({ page }) => {
    // Mock the API patch request to avoid hitting the real Gmail API during E2E.
    await page.route(`**/api/drafts/${draftId}`, async route => {
      // Simulate the API logic updating the DB status to 'sent'
      await db.update(emailDrafts).set({ status: 'sent' }).where(eq(emailDrafts.id, draftId))
      await route.fulfill({ status: 200, json: { success: true } })
    })

    // Navigate to dashboard
    await page.goto('/dashboard')

    // Assert card appears with our stubbed data
    await expect(page.getByText('E2E Test Subject')).toBeVisible()
    await expect(page.getByText('E2E Body')).toBeVisible()

    // Click approve
    const approveBtn = page.getByTestId('approve-btn').first()
    await expect(approveBtn).toBeVisible()
    await approveBtn.click()

    // Wait a brief moment for the mocked API call and DB update to finish
    await page.waitForTimeout(1000)

    // Assert status changes in DB
    const updatedDraft = await db.select().from(emailDrafts).where(eq(emailDrafts.id, draftId))
    expect(updatedDraft[0].status).toBe('sent')
  })
})
