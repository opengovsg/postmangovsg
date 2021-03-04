import type { Request, Response, NextFunction } from 'express'
import { SmsTransactionalService } from '@sms/services'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from 'postman-templating'
import { RecipientError } from '@core/errors'
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

export const SmsTransactionalMiddleware = {
  sendMessage,
}
