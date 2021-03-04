import type { Request, Response, NextFunction } from 'express'
import expressRateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { RedisService } from '@core/services'
import { EmailTransactionalService } from '@email/services'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from 'postman-templating'
import { AuthService } from '@core/services'

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

    if (err instanceof TemplateError) {
      res.status(400).json({ message: err.message })
      return
    }
    next(err)
  }
}

const rateLimit = expressRateLimit({
  store: new RedisStore({
    prefix: 'email-transactional:',
    client: RedisService.rateLimitClient,
    expiry: config.get('transactionalEmail.window'),
  }),
  keyGenerator: () => 'global',
  windowMs: config.get('transactionalEmail.window') * 1000,
  max: config.get('transactionalEmail.rate'),
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
