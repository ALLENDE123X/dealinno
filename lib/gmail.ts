import { google } from 'googleapis'
import { logger } from './logger'

export function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

export async function watchInbox(accessToken: string) {
  try {
    const gmail = getGmailClient(accessToken)
    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: process.env.GOOGLE_PUBSUB_TOPIC,
      },
    })
    logger.info({ res: res.data }, 'Gmail watch successfully registered')
    return res.data
  } catch (error) {
    logger.error({ error }, 'Failed to set up Gmail watch')
    throw error
  }
}

export async function getHistory(
  accessToken: string,
  startHistoryId: string
): Promise<Array<{ id: string }>> {
  try {
    const gmail = getGmailClient(accessToken)
    const res = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      labelId: 'INBOX',
    })

    const messages: Array<{ id: string }> = []
    for (const record of res.data.history ?? []) {
      for (const added of record.messagesAdded ?? []) {
        if (added.message?.id) messages.push({ id: added.message.id })
      }
    }
    return messages
  } catch (error) {
    logger.error({ error, startHistoryId }, 'Failed to list Gmail history')
    throw error
  }
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string): string {
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function extractBody(payload: any): string {
  if (!payload) return ''

  if (payload.body?.data) return decodeBase64(payload.body.data)

  if (payload.parts) {
    // Prefer text/plain
    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (textPart?.body?.data) return decodeBase64(textPart.body.data)
    // Fall back to text/html stripped
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')
    if (htmlPart?.body?.data) return decodeBase64(htmlPart.body.data).replace(/<[^>]+>/g, '')
    // Recurse into nested parts
    for (const part of payload.parts) {
      const body = extractBody(part)
      if (body) return body
    }
  }
  return ''
}

export interface ParsedMessage {
  messageId: string
  threadId: string
  subject: string
  from: string
  toAddresses: string[]
  body: string
}

export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<ParsedMessage | null> {
  try {
    const gmail = getGmailClient(accessToken)
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    })

    const msg = res.data
    const headers = msg.payload?.headers ?? []
    const subject = getHeader(headers, 'Subject')
    const from = getHeader(headers, 'From')
    const to = getHeader(headers, 'To')
    const toAddresses = to.split(',').map(a => a.trim()).filter(Boolean)
    const body = extractBody(msg.payload)

    return {
      messageId,
      threadId: msg.threadId ?? '',
      subject,
      from,
      toAddresses,
      body,
    }
  } catch (error) {
    logger.error({ error, messageId }, 'Failed to fetch Gmail message')
    return null
  }
}

export async function createDraft(
  accessToken: string,
  opts: {
    to: string[]
    subject: string
    bodyText: string
    bodyHtml: string
    threadId: string
    inReplyTo?: string
  }
) {
  try {
    const gmail = getGmailClient(accessToken)
    const { to, subject, bodyText, bodyHtml, threadId, inReplyTo } = opts

    const toHeader = to.join(', ')
    const subjectHeader = subject.startsWith('Re:') ? subject : `Re: ${subject}`

    const mime = [
      `To: ${toHeader}`,
      `Subject: ${subjectHeader}`,
      ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`] : []),
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="boundary-dealinno"',
      '',
      '--boundary-dealinno',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      bodyText,
      '',
      '--boundary-dealinno',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      bodyHtml,
      '--boundary-dealinno--',
    ]

    const raw = Buffer.from(mime.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { threadId, raw },
      },
    })

    logger.info({ draftId: res.data.id, threadId }, 'Gmail draft successfully created')
    return res.data
  } catch (error) {
    logger.error({ error, threadId: opts.threadId }, 'Failed to create Gmail draft')
    throw error
  }
}

