import type { Request, Response, NextFunction } from 'express'
import { SmsTransactionalService } from '@sms/services'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from 'postman-templating'

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

    if (err instanceof TemplateError) {
      res.status(400).json({ message: err.message })
      return
    }
    next(err)
  }
}

export const SmsTransactionalMiddleware = {
  sendMessage,
}
