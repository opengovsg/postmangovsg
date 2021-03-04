import type { Request, Response, NextFunction } from 'express'
import { EmailTransactionalService } from '@email/services'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

function errored({
  next,
  message,
  action,
  error,
}: {
  next: NextFunction
  message: string
  action: string
  error?: Error
}): void {
  error = error ?? new Error(message)
  logger.error({
    message,
    error,
    action,
  })
  next(error)
}

async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ACTION = 'sendMessage'
  const ERR_MESSAGE = 'Failed to send email'

  try {
    const { subject, body, from, recipient, reply_to: replyTo } = req.body

    logger.info({ message: 'Sending email', action: ACTION })
    const messageId = await EmailTransactionalService.sendMessage({
      subject,
      body,
      from,
      recipient,
      replyTo,
    })
    if (!messageId) {
      errored({ next, action: ACTION, message: ERR_MESSAGE })
      return
    }
    res.sendStatus(202)
  } catch (error) {
    errored({ next, action: ACTION, message: ERR_MESSAGE, error })
  }
}

export const EmailTransactionalMiddleware = {
  sendMessage,
}
