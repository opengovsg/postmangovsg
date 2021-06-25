import redis from 'redis'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

if (!config.get('redisOtpUri')) {
  throw new Error('otpClient: redisOtpUri not found')
}

/**
 * Client to redis cache for storing otps
 */
const otpClient = redis
  .createClient({ url: config.get('redisOtpUri') || undefined })
  .on('connect', () => {
    logger.info({
      message: 'otpClient: Connected',
      url: config.get('redisOtpUri'),
    })
  })
  .on('error', (err: Error) => {
    logger.error({
      message: 'Failed to connect to otpClient',
      url: config.get('redisOtpUri'),
      error: String(err),
    })
  })

if (!config.get('redisSessionUri')) {
  throw new Error('sessionClient: redisSessionUri not found')
}

/**
 * Client to redis cache for storing sessions
 */
const sessionClient = redis
  .createClient({ url: config.get('redisSessionUri') || undefined })
  .on('connect', () => {
    logger.info({
      message: 'sessionClient: Connected',
      url: config.get('redisSessionUri'),
    })
  })
  .on('error', (err: Error) => {
    logger.error({
      message: 'Failed to connect to sessionClient',
      url: config.get('redisSessionUri'),
      error: String(err),
    })
  })

if (!config.get('redisRateLimitUri')) {
  throw new Error('rateLimitClient: redisRateLimitUri not found')
}

/**
 * Client to redis cache for rate limiting transactional requests
 */
const rateLimitClient = redis
  .createClient({
    enable_offline_queue: false,
    url: config.get('redisRateLimitUri') || undefined,
  })
  .on('connect', () => {
    logger.info({
      message: 'rateLimitClient: Connected',
      url: config.get('redisRateLimitUri'),
    })
  })
  .on('error', (err: Error) => {
    logger.error({
      message: 'Failed to connect to rateLimitClient',
      url: config.get('redisRateLimitUri'),
      error: String(err),
    })
  })

if (!config.get('redisCredentialUri')) {
  throw new Error('credentialClient: redisCredentialUri not found')
}

/**
 * Client to redis cache for storing credentials
 */
const credentialClient = redis
  .createClient({
    url: config.get('redisCredentialUri') || undefined,
  })
  .on('connect', () => {
    logger.info({
      message: 'credentialClient: Connected',
      url: config.get('redisCredentialUri'),
    })
  })
  .on('error', (err: Error) => {
    logger.error({
      message: 'Failed to connect to credentialClient',
      url: config.get('redisCredentialUri'),
      error: String(err),
    })
  })

/**
 * Shutdown all redis clients
 */
const shutdown = async (): Promise<void> => {
  const clients = [otpClient, sessionClient, rateLimitClient, credentialClient]
  await Promise.all(
    clients.map((client) => new Promise((resolve) => client.quit(resolve)))
  )
  await new Promise((resolve) => setImmediate(resolve))
}

export const RedisService = {
  otpClient,
  sessionClient,
  rateLimitClient,
  credentialClient,
  shutdown,
}
