import { EmailTemplateService, EmailService } from '@email/services'
import { MailToSend } from '@shared/clients/mail-client.class'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from '@shared/templating'
import { isBlacklisted } from '@email/utils/query'
import { InvalidRecipientError } from '@core/errors'
import { FileAttachmentService } from '@core/services'
import { UploadedFile } from 'express-fileupload'

const logger = loggerWithLabel(module)

/**
 * Sanitizes an email message and sends it.
 * @throws TemplateError if the body or subject is invalid
 * @throws MaliciousFileError if file attachment is potentially malicious
 * @throws UnsupportedFileTypeError if file attachment is unsupported file type
 * @throws Error if the message could not be sent.
 */
async function sendMessage({
  subject,
  body,
  from,
  recipient,
  replyTo,
  attachments,
}: {
  subject: string
  body: string
  from: string
  recipient: string
  replyTo?: string
  attachments?: UploadedFile[]
}): Promise<void> {
  const sanitizedSubject =
    EmailTemplateService.client.replaceNewLinesAndSanitize(subject)
  const sanitizedBody = EmailTemplateService.client.filterXSS(body)
  if (!sanitizedSubject || !sanitizedBody) {
    throw new TemplateError(
      'Message is invalid as the subject or body only contains invalid HTML tags.'
    )
  }

  let sanitizedAttachments
  if (attachments) {
    sanitizedAttachments = await FileAttachmentService.sanitizeFiles(
      attachments
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
    attachments: sanitizedAttachments,
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
