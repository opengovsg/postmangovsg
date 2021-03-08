import { TemplateError } from 'postman-templating'
import { SmsService, SmsTemplateService } from '@sms/services'
import { TwilioCredentials } from '@sms/interfaces'
import { loggerWithLabel } from '@core/logger'
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible'
import { RedisService } from '@core/services'
import config from '@core/config'
import { RateLimitError } from '@core/errors'

const logger = loggerWithLabel(module)

/**
 * Sanitizes an SMS message and sends it.
 * @throws TemplateError if the body is invalid
 * @throws Error if the message could not be sent
 */
async function sendMessage({
  credentials,
  body,
  recipient,
}: {
  credentials: TwilioCredentials
  body: string
  recipient: string
}): Promise<void> {
  const sanitizedBody = SmsTemplateService.client.replaceNewLinesAndSanitize(
    body
  )
  if (!sanitizedBody) {
    throw new TemplateError(
      'Message is invalid as it only contains invalid HTML tags.'
    )
  }

  logger.info({
    message: 'Sending transactional SMS',
    action: 'sendMessage',
  })
  const sid = await SmsService.sendMessage(
    credentials,
    recipient,
    sanitizedBody
  )
  if (!sid) {
    throw new Error('Failed to send transactional SMS')
  }
}

const rateLimitClient = new RateLimiterRedis({
  storeClient: RedisService.rateLimitClient,
  keyPrefix: 'transactionalSms:',
  points: config.get('transactionalSms.rate'),
  duration: config.get('transactionalSms.window'),
})

async function rateLimit(key: string) {
  const ACTION = 'rateLimit'

  const rateLimiterRes = await rateLimitClient.get(key)
  // If rateLimiterRes is null, the key hasn't been used before
  const remainingTokens = rateLimiterRes?.remainingPoints ?? 1
  if (!remainingTokens) {
    throw new RateLimitError()
  }

  try {
    await rateLimitClient.consume(key)
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

export const SmsTransactionalService = {
  sendMessage,
  rateLimit,
}
