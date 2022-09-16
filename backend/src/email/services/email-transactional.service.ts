import { EmailService, EmailTemplateService } from '@email/services'
import { MailToSend } from '@shared/clients/mail-client.class'
import { loggerWithLabel } from '@core/logger'
import { isBlacklisted } from '@email/utils/query'
import { InvalidMessageError, InvalidRecipientError } from '@core/errors'
import { FileAttachmentService } from '@core/services'
import { EmailMessageTx, TransactionalEmailMessageStatus } from '@email/models'

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
  emailMessageTxId,
}: {
  subject: string
  body: string
  from: string
  recipient: string
  replyTo?: string
  attachments?: { data: Buffer; name: string }[]
  emailMessageTxId: number
}): Promise<void> {
  const sanitizedSubject =
    EmailTemplateService.client.replaceNewLinesAndSanitize(subject)
  const sanitizedBody = EmailTemplateService.client.filterXSS(body)
  if (!sanitizedSubject || !sanitizedBody) {
    await EmailMessageTx.update(
      {
        status: TransactionalEmailMessageStatus.InvalidMessageError,
        errorCode: '400',
      },
      {
        where: { id: emailMessageTxId },
      }
    )
    throw new InvalidMessageError()
  }

  const sanitizedAttachments = attachments
    ? await FileAttachmentService.sanitizeFiles(attachments, emailMessageTxId)
    : undefined

  const blacklisted = await isBlacklisted(recipient)
  if (blacklisted) {
    await EmailMessageTx.update(
      {
        status: TransactionalEmailMessageStatus.BlacklistedRecipientError,
        errorCode: '400',
      },
      {
        where: { id: emailMessageTxId },
      }
    )
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
