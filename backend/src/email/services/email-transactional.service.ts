import { EmailService, EmailTemplateService } from '@email/services'
import { MailToSend } from '@shared/clients/mail-client.class'
import { loggerWithLabel } from '@core/logger'
import { isBlacklisted } from '@email/utils/query'
import {
  EMPTY_MESSAGE_ERROR,
  EmptyMessageError,
  InvalidRecipientError,
} from '@core/errors'
import { FileAttachmentService } from '@core/services'
import {
  EmailMessageTransactional,
  TransactionalEmailMessageStatus,
} from '@email/models'
import { SesEventType } from '@email/interfaces/callback.interface'

const logger = loggerWithLabel(module)

/**
 * Sanitizes an email message and sends it.
 * @throws TemplateError if the body or subject is invalid
 * @throws MaliciousFileError if file attachment is potentially malicious
 * @throws UnsupportedFileTypeError if file attachment is unsupported file type
 * @throws Error if the message could not be sent.
 */

export const EMPTY_MESSAGE_ERROR_CODE = `Error 400: ${EMPTY_MESSAGE_ERROR}`

async function sendMessage({
  subject,
  body,
  from,
  recipient,
  replyTo,
  attachments,
  emailMessageTransactionalId,
}: {
  subject: string
  body: string
  from: string
  recipient: string
  replyTo?: string
  attachments?: { data: Buffer; name: string }[]
  emailMessageTransactionalId: number
}): Promise<void> {
  const sanitizedSubject =
    EmailTemplateService.client.replaceNewLinesAndSanitize(subject)
  const sanitizedBody = EmailTemplateService.client.filterXSS(body)
  // this only triggers if the subject or body is empty after sanitization
  // highly unlikely in practice
  if (!sanitizedSubject || !sanitizedBody) {
    void EmailMessageTransactional.update(
      {
        errorCode: EMPTY_MESSAGE_ERROR_CODE,
      },
      {
        where: { id: emailMessageTransactionalId },
      }
    )
    throw new EmptyMessageError()
  }

  const sanitizedAttachments = attachments
    ? await FileAttachmentService.sanitizeFiles(
        attachments,
        emailMessageTransactionalId
      )
    : undefined

  const blacklisted = await isBlacklisted(recipient)
  if (blacklisted) {
    void EmailMessageTransactional.update(
      {
        errorCode: 'Error 400: Blacklisted recipient',
      },
      {
        where: { id: emailMessageTransactionalId },
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
    referenceId: emailMessageTransactionalId.toString(),
  }
  logger.info({
    message: 'Sending transactional email',
    action: 'sendMessage',
  })
  const messageId = await EmailService.sendEmail(mailToSend, {
    extraSmtpHeaders: { isTransactional: true },
  })
  if (!messageId) {
    throw new Error('Failed to send transactional email')
  }
}

type CallbackMetaData = {
  timestamp: Date
  bounce?: {
    bounceType: string
    bounceSubType: string
  }
  complaint?: {
    complaintFeedbackType: string
    complaintSubType: string
  }
}
async function handleStatusCallbacks(
  type: SesEventType,
  id: string,
  metadata: CallbackMetaData
): Promise<void> {
  switch (type) {
    case SesEventType.Delivery:
      await EmailMessageTransactional.update(
        {
          status: TransactionalEmailMessageStatus.Delivered,
          deliveredAt: metadata.timestamp,
        },
        {
          where: { id },
        }
      )
      break
    case SesEventType.Bounce:
      await EmailMessageTransactional.update(
        {
          status: TransactionalEmailMessageStatus.Bounced,
          errorCode:
            metadata.bounce?.bounceType === 'Permanent'
              ? 'Hard bounce'
              : 'Soft bounce',
          errorSubType: metadata.bounce?.bounceSubType,
        },
        {
          where: { id },
        }
      )
      break
    case SesEventType.Complaint:
      await EmailMessageTransactional.update(
        {
          status: TransactionalEmailMessageStatus.Complaint,
          errorCode: metadata.complaint?.complaintFeedbackType,
          errorSubType: metadata.complaint?.complaintSubType,
        },
        {
          where: { id },
        }
      )
      break
    case SesEventType.Open:
      await EmailMessageTransactional.update(
        {
          status: TransactionalEmailMessageStatus.Opened,
          openedAt: metadata.timestamp,
        },
        {
          where: { id },
        }
      )
      break
    case SesEventType.Send:
      await EmailMessageTransactional.update(
        {
          status: TransactionalEmailMessageStatus.Sent,
          sentAt: metadata.timestamp,
        },
        {
          where: { id },
        }
      )
      break
    default:
      logger.error({
        message: 'Unable to handle messages with this type',
        type,
        id,
        metadata,
      })
  }
}

export const EmailTransactionalService = {
  sendMessage,
  handleStatusCallbacks,
}
