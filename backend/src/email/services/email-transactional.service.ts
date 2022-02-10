import { EmailTemplateService, EmailService } from '@email/services'
import { MailToSend } from '@core/interfaces'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from '@shared/templating'
import { isBlacklisted } from '@email/utils/query'
import { InvalidRecipientError } from '@core/errors'

const logger = loggerWithLabel(module)

/**
 * Sanitizes an email message and sends it.
 * @throws TemplateError if the body or subject is invalid
 * @throws Error if the message could not be sent.
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
}): Promise<void> {
  const sanitizedSubject =
    EmailTemplateService.client.replaceNewLinesAndSanitize(subject)
  const sanitizedBody = EmailTemplateService.client.filterXSS(body)
  if (!sanitizedSubject || !sanitizedBody) {
    throw new TemplateError(
      'Message is invalid as the subject or body only contains invalid HTML tags.'
    )
  }

  const blacklisted = await isBlacklisted(recipient)
  if (blacklisted) {
    throw new InvalidRecipientError('Recipient email is blacklisted')
  }

  const mailToSend: MailToSend = {
    subject: sanitizedSubject,
    from: from,
    body: sanitizedBody,
    recipients: [recipient],
    replyTo,
  }
  logger.info({
    message: 'Sending transactional email',
    action: 'sendMessage',
  })
  const messageId = await EmailService.sendEmail(mailToSend)
  if (!messageId) {
    throw new Error('Failed to send transactional email')
  }
}

export const EmailTransactionalService = {
  sendMessage,
}
