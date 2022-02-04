import type { Request, Response, NextFunction } from 'express'
import expressRateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { RedisService } from '@core/services'
import { EmailTransactionalService } from '@email/services'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from '@shared/templating'
import { AuthService } from '@core/services'
import { InvalidRecipientError } from '@core/errors'
import { RedisClient } from 'redis'

const logger = loggerWithLabel(module)

async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ACTION = 'sendMessage'

  try {
    const { subject, body, from, recipient, reply_to: replyTo } = req.body

    logger.info({ message: 'Sending email', action: ACTION })
    await EmailTransactionalService.sendMessage({
      subject,
      body,
      from,
      recipient,
      replyTo:
        replyTo ?? (await AuthService.findUser(req.session?.user?.id))?.email,
    })
    res.sendStatus(202)
  } catch (err) {
    logger.error({
      message: 'Failed to send email',
      action: ACTION,
      error: err,
    })

    const BAD_REQUEST_ERRORS = [TemplateError, InvalidRecipientError]
    if (BAD_REQUEST_ERRORS.some((errType) => err instanceof errType)) {
      res.status(400).json({ message: (err as Error).message })
      return
    }
    next(err)
  }
}

const rateLimit = expressRateLimit({
  store: new RedisStore({
    prefix: 'transactionalEmail:',
    client: RedisService.rateLimitClient as RedisClient,
    expiry: config.get('transactionalEmail.window'),
  }),
  keyGenerator: (req: Request) => req?.session?.user.id,
  windowMs: config.get('transactionalEmail.window') * 1000,
  max: config.get('transactionalEmail.rate'),
  draft_polli_ratelimit_headers: true,
  message: {
    status: 429,
    message: 'Too many requests. Please try again later.',
  },
  handler: (req: Request, res: Response) => {
    logger.warn({
      message: 'Rate limited request to send transactional email',
      userId: req?.session?.user.id,
    })
    res.sendStatus(429)
  },
})

export const EmailTransactionalMiddleware = {
  sendMessage,
  rateLimit,
}
