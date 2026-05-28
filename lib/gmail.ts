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

export async function getHistory(accessToken: string, startHistoryId: string) {
  try {
    const gmail = getGmailClient(accessToken)
    const res = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      labelId: 'INBOX',
    })
    return res.data
  } catch (error) {
    logger.error({ error, startHistoryId }, 'Failed to list Gmail history')
    throw error
  }
}

export async function getMessage(accessToken: string, messageId: string) {
  try {
    const gmail = getGmailClient(accessToken)
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    })
    return res.data
  } catch (error) {
    logger.error({ error, messageId }, 'Failed to fetch Gmail message')
    throw error
  }
}

export async function createDraft(
  accessToken: string,
  threadId: string,
  messageId: string,
  to: string[],
  subject: string,
  bodyText: string,
  bodyHtml?: string
) {
  try {
    const gmail = getGmailClient(accessToken)

    const toHeader = to.join(', ')
    const subjectHeader = subject.startsWith('Re:') ? subject : `Re: ${subject}`

    const mime = [
      `To: ${toHeader}`,
      `Subject: ${subjectHeader}`,
      `In-Reply-To: ${messageId}`,
      `References: ${messageId}`,
      'MIME-Version: 1.0',
    ]

    if (bodyHtml) {
      mime.push('Content-Type: multipart/alternative; boundary="boundary-dealinno"')
      mime.push('')
      mime.push('--boundary-dealinno')
      mime.push('Content-Type: text/plain; charset=UTF-8')
      mime.push('Content-Transfer-Encoding: 7bit')
      mime.push('')
      mime.push(bodyText)
      mime.push('')
      mime.push('--boundary-dealinno')
      mime.push('Content-Type: text/html; charset=UTF-8')
      mime.push('Content-Transfer-Encoding: 7bit')
      mime.push('')
      mime.push(bodyHtml)
      mime.push('--boundary-dealinno--')
    } else {
      mime.push('Content-Type: text/plain; charset=UTF-8')
      mime.push('Content-Transfer-Encoding: 7bit')
      mime.push('')
      mime.push(bodyText)
    }

    const mimeMessage = mime.join('\r\n')
    const raw = Buffer.from(mimeMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          threadId,
          raw,
        },
      },
    })
    logger.info({ draftId: res.data.id, threadId }, 'Gmail draft successfully created')
    return res.data
  } catch (error) {
    logger.error({ error, threadId, messageId }, 'Failed to create Gmail draft')
    throw error
  }
}
