import type { Request, Response, NextFunction } from 'express'
import config from '@core/config'
import { SmsTransactionalService } from '@sms/services'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from 'postman-templating'
import { RecipientError, RateLimitError } from '@core/errors'
import { TwilioError } from '@sms/errors'

const logger = loggerWithLabel(module)

async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ACTION = 'sendMessage'

  try {
    const { recipient, body } = req.body
    const { credentials } = res.locals

    logger.info({ message: 'Sending SMS', action: ACTION })
    await SmsTransactionalService.sendMessage({
      credentials,
      recipient,
      body,
    })
    res.sendStatus(202)
  } catch (err) {
    logger.error({
      message: 'Failed to send SMS',
      error: err,
      action: ACTION,
    })

    const BAD_REQUEST_ERRORS = [TemplateError, RecipientError]
    if (BAD_REQUEST_ERRORS.some((errType) => err instanceof errType)) {
      res.status(400).json({ message: err.message })
      return
    }

    if (err instanceof TwilioError) {
      const { statusCode, message } = err
      res.status(statusCode).json({ message })
      return
    }

    next(err)
  }
}

async function rateLimit(
  _: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ACTION = 'rateLimit'
  const key = res.locals.credentials.accountSid
  try {
    await SmsTransactionalService.rateLimit(key)
    next()
  } catch (err) {
    if (err instanceof RateLimitError) {
      logger.warn({
        message: 'Rate limited transactional SMS request',
        accountSid: key,
      })
      res
        .set('Retry-After', config.get('transactionalSms.window'))
        .sendStatus(429)
      return
    }

    logger.error({
      error: err,
      action: ACTION,
      message: 'Failed to rate limit transactional SMS request',
    })
    next(err)
  }
}

export const SmsTransactionalMiddleware = {
  sendMessage,
  rateLimit,
}
