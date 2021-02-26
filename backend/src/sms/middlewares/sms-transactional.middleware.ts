import type { Request, Response, NextFunction } from 'express'
import expressRateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { RedisService } from '@core/services'
import config from '@core/config'
import { SmsService } from '@sms/services'
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
  const ERR_MESSAGE = 'Failed to send SMS'
  const ACTION = 'sendMessage'

  try {
    const { recipient, body } = req.body
    const { credentials } = res.locals

    logger.info({ message: 'Sending SMS', action: ACTION })
    const sid = await SmsService.sendMessage(credentials, recipient, body)
    if (!sid) {
      errored({ next, message: ERR_MESSAGE, action: ACTION })
      return
    }
    res.status(202).json({ message: 'Accepted' })
  } catch (error) {
    errored({ next, message: ERR_MESSAGE, action: ACTION, error })
  }
}

const rateLimit = expressRateLimit({
  store: new RedisStore({
    prefix: 'sms-single-send:',
    client: RedisService.rateLimitClient,
    expiry: 1,
  }),
  keyGenerator(_: Request, res: Response) {
    return res.locals.credentials.accountSid
  },
  windowMs: 1000,
  max: config.get('singleSendSmsRate'),
  draft_polli_ratelimit_headers: true,
  message: {
    status: 429,
    message: 'Too many requests. Please try again later.',
  },
})

export const SmsTransactionalMiddleware = {
  sendMessage,
  rateLimit,
}
