import type { Request, Response, NextFunction } from 'express'
import { SmsService } from '@sms/services'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { recipient, body } = req.body
    const { credentials } = res.locals

    logger.info({ message: 'Sending SMS', action: 'sendMessage' })
    const success = await SmsService.sendMessage(credentials, recipient, body)
    if (success) {
      res.status(202).json({ message: 'Accepted' })
    } else {
      const err = new Error('Failed to send SMS')
      logger.error({
        message: 'Failed to send SMS',
        error: err,
        action: 'sendMessage',
      })
      next(err)
    }
  } catch (err) {
    logger.error({
      message: 'Failed to send SMS',
      error: err,
      action: 'sendMessage',
    })
    next(err)
  }
}

export const SmsSingleSendMiddleware = {
  sendMessage,
}
