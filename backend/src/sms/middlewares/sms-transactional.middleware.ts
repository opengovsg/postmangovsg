import type { Request, Response, NextFunction } from 'express'
import { SmsTransactionalService } from '@sms/services'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from '@shared/templating'
import { RateLimitError, InvalidRecipientError } from '@core/errors'

const logger = loggerWithLabel(module)

async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ACTION = 'sendMessage'

  const { credentials } = res.locals
  try {
    const { recipient, body } = req.body

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
  sendMessage,
}
