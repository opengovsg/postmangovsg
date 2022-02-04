import redis, { RedisClient } from 'redis'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

export const RedisService: {
  otpClient: RedisClient | undefined
  sessionClient: RedisClient | undefined
  rateLimitClient: RedisClient | undefined
  credentialClient: RedisClient | undefined
  init: () => void
  shutdown: () => Promise<unknown[]>
} = {
  otpClient: undefined,
  sessionClient: undefined,
  rateLimitClient: undefined,
  credentialClient: undefined,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  init: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  shutdown: (): Promise<unknown[]> => new Promise((resolve) => resolve([])),
}

RedisService.init = (): void => {
  if (!config.get('redisOtpUri')) {
    throw new Error('otpClient: redisOtpUri not found')
  }
  RedisService.otpClient = redis
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
  RedisService.sessionClient = redis
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
  RedisService.rateLimitClient = redis
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
  RedisService.credentialClient = redis
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
}

/**
 * Shutdown all redis clients
 */
RedisService.shutdown = async (): Promise<unknown[]> => {
  const clients = [
    RedisService.otpClient,
    RedisService.sessionClient,
    RedisService.rateLimitClient,
    RedisService.credentialClient,
  ]
  return Promise.all(
    clients.map((client) =>
      client
        ? new Promise((resolve) => client.flushall(() => client.quit(resolve)))
        : new Promise((resolve) => resolve(null))
    )
  )
}
