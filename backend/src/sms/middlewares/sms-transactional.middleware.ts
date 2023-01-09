import type { Request, Response, NextFunction } from 'express'
import { SmsTransactionalService } from '@sms/services'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from '@shared/templating'
import { RateLimitError, InvalidRecipientError } from '@core/errors'
import { SmsMessageTransactional } from '@sms/models/sms-message-transactional'

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
    await smsMessageTransactional.save()
    res.status(201).json(convertMessageModelToResponse(smsMessageTransactional))
  } catch (err) {
    logger.error({
      message: 'Failed to send SMS',
      error: err,
      action,
    })

    const BAD_REQUEST_ERRORS = [TemplateError, InvalidRecipientError]
    if (BAD_REQUEST_ERRORS.some((errType) => err instanceof errType)) {
      res.status(400).json({ message: (err as Error).message })
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

export const SmsTransactionalMiddleware = {
  saveMessage,
  sendMessage,
}
