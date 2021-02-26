import { EmailService } from '@email/services'
import { MailToSend } from '@core/interfaces'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

/**
 * Sends an email message.
 * @param subject
 * @param body
 * @param from
 * @param recipient
 * @param replyTo
 *
 * @returns Promise<boolean> Resolves to true if the message was successfully sent.
 */
async function sendMessage({
  subject,
  body,
  from,
  recipient,
  replyTo,
}: {
  subject: string
  body: string
  from: string
  recipient: string
  replyTo?: string
}): Promise<boolean> {
  const mailToSend: MailToSend = {
    subject,
    from: from,
    body,
    recipients: [recipient],
    replyTo,
  }
  logger.info({ message: 'Sending a single email', action: 'sendMessage' })
  const messageId = await EmailService.sendEmail(mailToSend)
  if (!messageId) {
    logger.error({
      error: new Error('Failed to send single email'),
      action: 'sendMessage',
    })
  }
  return !!messageId
}

export const EmailSingleSendService = {
  sendMessage,
}
