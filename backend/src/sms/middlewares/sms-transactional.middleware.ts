import type { NextFunction, Request, Response } from 'express'
import { SmsTransactionalService } from '@sms/services'
import { loggerWithLabel } from '@core/logger'
import { InvalidRecipientError, RateLimitError } from '@core/errors'
import {
  SmsMessageTransactional,
  TransactionalSmsMessageStatus,
} from '@sms/models/sms-message-transactional'
import {
  Ordering,
  TimestampFilter,
  TransactionalSmsSortField,
} from '@core/constants'
import {
  AuthenticationError,
  InvalidPhoneNumberError,
} from '@shared/clients/twilio-client.class/errors'

const logger = loggerWithLabel(module)

function convertMessageModelToResponse(message: SmsMessageTransactional) {
  return {
    id: message.id,
    credentialsLabel: message.credentialsLabel,
    recipient: message.recipient,
    body: message.body,
    message_id: message.messageId,
    created_at: message.createdAt,
    updated_at: message.updatedAt,
    status: message.status,
    error_code: message.errorCode,
    accepted_at: message.acceptedAt?.toISOString() || null,
    sent_at: message.sentAt?.toISOString() || null,
    delivered_at: message.deliveredAt?.toISOString() || null,
    errored_at: message.erroredAt?.toISOString() || null,
  }
}

async function saveMessage(
  req: Request,
  _: Response,
  next: NextFunction
): Promise<void> {
  const action = 'saveMessage'
  logger.info({ message: 'Saving SMS', action })
  const { recipient, body, label } = req.body

  const smsMessageTransactional = await SmsMessageTransactional.create({
    userId: req.session?.user?.id,
    recipient,
    body,
    credentialsLabel: label,
    messageId: null,
    status: TransactionalSmsMessageStatus.Unsent,
    // not sure why unknown is needed to silence TS (yet other parts of the code base can just use `as Model` directly hmm)
  } as unknown as SmsMessageTransactional)
  req.body.smsMessageTransactionalId = smsMessageTransactional.id // for subsequent middlewares to distinguish whether this is a transactional SMS
  next()
}

async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const action = 'sendMessage'

  const { credentials } = res.locals
  try {
    const smsMessageTransactional = await SmsMessageTransactional.findByPk(
      req.body.smsMessageTransactionalId
    )
    if (!smsMessageTransactional) {
      throw new Error('Unable to find entry in sms_messages_transactional')
    }
    logger.info({ message: 'Sending transactional SMS (middleware)', action })
    const messageId = await SmsTransactionalService.sendMessage({
      credentials,
      recipient: smsMessageTransactional.recipient,
      body: smsMessageTransactional.body,
    })
    if (!messageId) {
      throw new Error('Unable to send SMS')
    }
    smsMessageTransactional.set('messageId', messageId)
    smsMessageTransactional.acceptedAt = new Date()
    await smsMessageTransactional.save()
    res.status(201).json(convertMessageModelToResponse(smsMessageTransactional))
  } catch (err) {
    logger.error({
      message: 'Failed to send SMS',
      error: err,
      action,
    })

    if (
      err instanceof InvalidPhoneNumberError ||
      err instanceof InvalidRecipientError
    ) {
      res.status(400).json({
        code: 'invalid_recipient',
        message: `Phone number ${req.body.recipient} is invalid`,
      })
      return
    }

    if (err instanceof AuthenticationError) {
      res.status(400).json({
        code: 'invalid_sms_credentials',
        message: 'Invalid Twilio credentials',
      })
      return
    }

    if (err instanceof RateLimitError) {
      logger.warn({
        message: 'Rate limited request to send transactional SMS',
        userId: req?.session?.user.id,
        label: credentials.label,
      })
      res.sendStatus(429)
      return
    }

    next(err)
  }
}

async function listMessages(req: Request, res: Response): Promise<void> {
  const { limit, offset, created_at, status, sort_by } = req.query

  const userId: string = req.session?.user?.id.toString() // id is number in session; convert to string for tests to pass (weird)
  const filter = created_at ? { createdAt: created_at } : undefined
  const sortBy = sort_by?.toString().replace(/[+-]/, '')
  const orderBy = sort_by?.toString().includes('+')
    ? Ordering.ASC
    : Ordering.DESC // default to descending order even without '-' prefix

  const { hasMore, messages } = await SmsTransactionalService.listMessages({
    userId,
    limit: +(limit as string),
    offset: +(offset as string),
    sortBy: sortBy as TransactionalSmsSortField,
    orderBy,
    status: status as TransactionalSmsMessageStatus,
    filterByTimestamp: filter as TimestampFilter,
  })
  res.status(200).json({
    has_more: hasMore,
    data: messages.map(convertMessageModelToResponse),
  })
}

async function getById(req: Request, res: Response): Promise<void> {
  const { smsId } = req.params
  const message = await SmsMessageTransactional.findOne({
    where: {
      id: smsId,
      userId: req.session?.user?.id.toString(),
    },
  })
  if (!message) {
    res.status(404).json({ message: `Sms message with ID ${smsId} not found.` })
    return
  }
  res.status(200).json(convertMessageModelToResponse(message))
}

export const SmsTransactionalMiddleware = {
  saveMessage,
  sendMessage,
  listMessages,
  getById,
}
