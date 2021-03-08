import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible'
import { EmailTemplateService, EmailService } from '@email/services'
import { MailToSend } from '@core/interfaces'
import { loggerWithLabel } from '@core/logger'
import { TemplateError } from 'postman-templating'
import { RedisService } from '@core/services'
import config from '@core/config'
import { RateLimitError } from '@core/errors'

const logger = loggerWithLabel(module)

/**
 * Sanitizes an email message and sends it.
 * @throws TemplateError if the body or subject is invalid
 * @throws Error if the message could not be sent.
 */
async function sendMessage({
  subject,
  body,
  from,
  recipient,
  replyTo,
}: {
  subject: string
  body: string
  from: string
  recipient: string
  replyTo?: string
}): Promise<void> {
  const sanitizedSubject = EmailTemplateService.client.replaceNewLinesAndSanitize(
    subject
  )
  const sanitizedBody = EmailTemplateService.client.filterXSS(body)
  if (!sanitizedSubject || !sanitizedBody) {
    throw new TemplateError(
      'Message is invalid as the subject or body only contains invalid HTML tags.'
    )
  }

  const mailToSend: MailToSend = {
    subject: sanitizedSubject,
    from: from,
    body: sanitizedBody,
    recipients: [recipient],
    replyTo,
  }
  logger.info({
    message: 'Sending transactional email',
    action: 'sendMessage',
  })
  const messageId = await EmailService.sendEmail(mailToSend)
  if (!messageId) {
    throw new Error('Failed to send transactional email')
  }
}

const rateLimitClients = {
  user: new RateLimiterRedis({
    storeClient: RedisService.rateLimitClient,
    keyPrefix: 'transactionalEmail.user:',
    points: config.get('transactionalEmail.userRate'),
    duration: config.get('transactionalEmail.window'),
  }),
  global: new RateLimiterRedis({
    storeClient: RedisService.rateLimitClient,
    keyPrefix: 'transactionalEmail.global:',
    points: config.get('transactionalEmail.globalRate'),
    duration: config.get('transactionalEmail.window'),
  }),
}

async function rateLimit(userKey: number, globalKey: string) {
  const ACTION = 'rateLimit'

  const userRateLimiterRes = await rateLimitClients.user.get(userKey)
  const globalRateLimiterRes = await rateLimitClients.user.get(globalKey)
  // If rateLimiterRes is null, the key has not been used before
  const remainingUserTokens = userRateLimiterRes?.remainingPoints ?? 1
  const remainingGlobalTokens = globalRateLimiterRes?.remainingPoints ?? 1
  if (!remainingUserTokens || !remainingGlobalTokens) {
    throw new RateLimitError()
  }

  try {
    await Promise.all([
      rateLimitClients.user.consume(userKey),
      rateLimitClients.global.consume(globalKey),
    ])
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      throw new RateLimitError()
    }

    logger.error({
      message: 'Failed to consume transactional email rate limit tokens',
      action: ACTION,
      error: err,
    })
    throw err
  }
}

export const EmailTransactionalService = {
  sendMessage,
  rateLimit,
}
