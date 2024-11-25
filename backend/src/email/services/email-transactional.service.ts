import { EmailService, EmailTemplateService } from '@email/services'
import { MailToSend } from '@shared/clients/mail-client.class'
import { loggerWithLabel } from '@core/logger'
import { EMPTY_SANITIZED_EMAIL, MessageError } from '@core/errors'
import { FileAttachmentService } from '@core/services'
import {
  EmailMessageTransactional,
  EmailMessageTransactionalCc,
  TransactionalEmailMessageStatus,
} from '@email/models'
import { SesEventType } from '@email/interfaces/callback.interface'
import {
  Ordering,
  TimestampFilter,
  TransactionalEmailSortField,
} from '@core/constants'
import { Order } from 'sequelize/types/model'
import { Op, WhereOptions } from 'sequelize'
import tracer from 'dd-trace'

const logger = loggerWithLabel(module)

/**
 * Sanitizes an email message and sends it.
 * @throws TemplateError if the body or subject is invalid
 * @throws MaliciousFileError if file attachment is potentially malicious
 * @throws UnsupportedFileTypeError if file attachment is unsupported file type
 * @throws Error if the message could not be sent.
 */

export const EMPTY_MESSAGE_ERROR_CODE = `Error 400: ${EMPTY_SANITIZED_EMAIL}`
export const BLACKLISTED_RECIPIENT_ERROR_CODE =
  'Error 400: Blacklisted recipient'

async function sendMessage({
  subject,
  body,
  from,
  recipient,
  replyTo,
  attachments,
  cc,
  bcc,
  emailMessageTransactionalId,
  disableTracking,
}: {
  subject: string
  body: string
  from: string
  recipient: string
  replyTo?: string
  attachments?: { data: Buffer; name: string }[]
  cc?: string[]
  bcc?: string[]
  emailMessageTransactionalId: string
  disableTracking?: boolean
}): Promise<void> {
  // TODO: flagging this coupling for future refactoring:
  // currently, we are using EmailTemplateService to sanitize both tx emails and campaign emails
  // while this works for now, in the future, we might want to have more liberal rules for tx emails
  // to allow API users the freedom to customize the look and feel of their emails
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
    throw new MessageError()
  }
  const bodyContainsCidTags = EmailTemplateService.client.containsCidTags(body)
  const sanitizedAttachments = attachments
    ? await FileAttachmentService.sanitizeFiles(
        attachments,
        emailMessageTransactionalId,
        bodyContainsCidTags
      )
    : undefined

  const mailToSend: MailToSend = {
    subject: sanitizedSubject,
    from: from,
    body: sanitizedBody,
    recipients: [recipient],
    replyTo,
    messageId: emailMessageTransactionalId.toString(),
    attachments: sanitizedAttachments,
    cc,
    bcc,
  }
  logger.info({
    message: 'Sending transactional email',
    action: 'sendMessage',
  })
  // receive from SES, but not saving to DB
  const isEmailSent = await EmailService.sendEmail(mailToSend, {
    extraSmtpHeaders: { isTransactional: true },
    disableTracking,
  })
  if (!isEmailSent) {
    throw new Error('Failed to send transactional email')
  }
}

type CallbackMetaData = {
  timestamp: Date
  bounce?: {
    bounceType: string
    bounceSubType: string
    bouncedRecipients?: { emailAddress: string }[]
  }
  complaint?: {
    complaintFeedbackType: string
    complaintSubType: string
    complainedRecipients?: { emailAddress: string }[]
  }
  delivery?: {
    recipients: string[]
  }
}

async function handleStatusCallbacks(
  type: SesEventType,
  id: string,
  metadata: CallbackMetaData,
  parentSpan?: tracer.Span
): Promise<void> {
  const handleStatusCallbacksSpan = tracer.startSpan('handleStatusCallbacks', {
    childOf: parentSpan,
  })
  const emailMessageTransactional = await EmailMessageTransactional.findByPk(id)
  if (!emailMessageTransactional) {
    throw new Error(`Failed to find emailMessageTransactional for id: ${id}`)
  }

  const mainRecipientDelivered = metadata.delivery?.recipients?.find(
    (e) => e === emailMessageTransactional.recipient
  )
  const mainRecipientBounced = metadata.bounce?.bouncedRecipients?.find(
    (e) => e.emailAddress === emailMessageTransactional.recipient
  )
  const mainRecipientComplained =
    metadata.complaint?.complainedRecipients?.find(
      (e) => e.emailAddress === emailMessageTransactional.recipient
    )

  switch (type) {
    case SesEventType.Delivery:
      if (mainRecipientDelivered) {
        await EmailMessageTransactional.update(
          {
            status: TransactionalEmailMessageStatus.Delivered,
            deliveredAt: metadata.timestamp,
          },
          {
            where: { id },
          }
        )
      }
      break
    case SesEventType.Bounce:
      // check that bounce applies to the main recipient
      if (mainRecipientBounced) {
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
      }
      break
    case SesEventType.Complaint:
      // check that complaint applies to the main recipient
      if (mainRecipientComplained) {
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
      }
      break
    case SesEventType.Open:
      // Cannot check that open applies to the main recipient
      // we only update the DB if there was no previous error
      await EmailMessageTransactional.update(
        {
          status: TransactionalEmailMessageStatus.Opened,
          openedAt: metadata.timestamp,
        },
        {
          where: { id, errorCode: null },
        }
      )
      break
    case SesEventType.Send:
      // Cannot check that send applies to the main recipient
      // we only update the DB if there was no previous error
      await EmailMessageTransactional.update(
        {
          status: TransactionalEmailMessageStatus.Sent,
          sentAt: metadata.timestamp,
        },
        {
          where: { id, errorCode: null },
        }
      )
      break
    default:
      logger.warn({
        message: 'Unable to handle messages with this type',
        type,
        id,
        metadata,
      })
  }
  handleStatusCallbacksSpan.finish()
}

async function listMessages({
  userId,
  limit,
  offset,
  sortBy,
  orderBy,
  status,
  filterByTimestamp,
  tag,
}: {
  userId: string
  limit?: number
  offset?: number
  sortBy?: TransactionalEmailSortField
  orderBy?: Ordering
  status?: TransactionalEmailMessageStatus
  filterByTimestamp?: TimestampFilter
  tag?: string
}): Promise<{
  hasMore: boolean
  messages: EmailMessageTransactional[]
}> {
  limit = limit || 10
  offset = offset || 0
  sortBy = sortBy || TransactionalEmailSortField.Created
  orderBy = orderBy || Ordering.DESC
  const order: Order = [[sortBy, orderBy]]
  const where = ((userId, status, filterByTimestamp, tag) => {
    const where: WhereOptions = { userId } // pre-fill with userId for authentication
    if (status) {
      where.status = status
    }
    if (tag) {
      where.tag = tag
    }
    if (filterByTimestamp) {
      if (filterByTimestamp.createdAt) {
        const { gt, gte, lt, lte } = filterByTimestamp.createdAt
        if (gt) {
          where.createdAt = { ...where.createdAt, [Op.gt]: gt }
        }
        if (gte) {
          where.createdAt = { ...where.createdAt, [Op.gte]: gte }
        }
        if (lt) {
          where.createdAt = { ...where.createdAt, [Op.lt]: lt }
        }
        if (lte) {
          where.createdAt = { ...where.createdAt, [Op.lte]: lte }
        }
      }
    }
    return where
  })(userId, status, filterByTimestamp, tag)
  const { count, rows } = await EmailMessageTransactional.findAndCountAll({
    limit,
    offset,
    where,
    order,
    include: [
      {
        //
        model: EmailMessageTransactionalCc,
        attributes: ['email', 'ccType'],
        where: { errorCode: { [Op.eq]: null } },
        required: false,
      },
    ],
  })
  const hasMore = count > offset + limit
  return { hasMore, messages: rows }
}

export const EmailTransactionalService = {
  sendMessage,
  handleStatusCallbacks,
  listMessages,
}
