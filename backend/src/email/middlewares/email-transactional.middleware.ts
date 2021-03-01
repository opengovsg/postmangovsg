import type { Request, Response, NextFunction } from 'express'
import expressRateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { RedisService } from '@core/services'
import { EmailTransactionalService } from '@email/services'
import config from '@core/config'
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
    res.status(202).json({ message: 'Accepted' })
  } catch (error) {
    errored({ next, action: ACTION, message: ERR_MESSAGE, error })
  }
}

const rateLimit = expressRateLimit({
  store: new RedisStore({
    prefix: 'email-transactional:',
    client: RedisService.rateLimitClient,
    expiry: 1,
  }),
  keyGenerator() {
    return 'global'
  },
  windowMs: 1000,
  max: config.get('transactionalEmailRate'),
  draft_polli_ratelimit_headers: true,
  message: {
    status: 429,
    message: 'Too many requests. Please try again later.',
  },
})

export const EmailTransactionalMiddleware = {
  sendMessage,
  rateLimit,
}
