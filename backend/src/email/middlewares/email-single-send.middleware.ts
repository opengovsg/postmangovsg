import type { Request, Response, NextFunction } from 'express'
import { EmailSingleSendService } from '@email/services'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { subject, body, from, recipient, reply_to: replyTo } = req.body

    logger.info({ message: 'Sending email', action: 'sendMessage' })
    const success = await EmailSingleSendService.sendMessage({
      subject,
      body,
      from,
      recipient,
      replyTo,
    })
    if (success) {
      res.status(202).json({ message: 'Accepted' })
    } else {
      const err = new Error('Failed to send email')
      logger.error({
        message: 'Failed to send email',
        error: err,
        action: 'sendMessage',
      })
      next(err)
    }
  } catch (err) {
    logger.error({
      message: 'Failed to send email',
      error: err,
      action: 'sendMessage',
    })
    next(err)
  }
}

export const EmailSingleSendMiddleware = {
  sendMessage,
}
