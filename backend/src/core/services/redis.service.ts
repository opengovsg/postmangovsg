import redis, { RedisClient } from 'redis'
import config from '@core/config'
import { loggerWithLabel } from '@shared/core/logger'

if (!config.get('redisOtpUri')) {
  throw new Error('otpClient: redisOtpUri not found')
}
if (!config.get('redisSessionUri')) {
  throw new Error('sessionClient: redisSessionUri not found')
}
if (!config.get('redisRateLimitUri')) {
  throw new Error('rateLimitClient: redisRateLimitUri not found')
}
if (!config.get('redisCredentialUri')) {
  throw new Error('credentialClient: redisCredentialUri not found')
}

export class RedisService {
  private logger = loggerWithLabel(module)
  /**
   * Client to redis cache for storing otps
   */
  public otpClient: RedisClient = redis
    .createClient({ url: config.get('redisOtpUri') || undefined })
    .on('connect', () => {
      this.logger.info({
        message: 'otpClient: Connected',
        url: config.get('redisOtpUri'),
      })
    })
    .on('error', (err: Error) => {
      this.logger.error({
        message: 'Failed to connect to otpClient',
        url: config.get('redisOtpUri'),
        error: String(err),
      })
    })

  /**
   * Client to redis cache for storing sessions
   */
  public sessionClient = redis
    .createClient({ url: config.get('redisSessionUri') || undefined })
    .on('connect', () => {
      this.logger.info({
        message: 'sessionClient: Connected',
        url: config.get('redisSessionUri'),
      })
    })
    .on('error', (err: Error) => {
      this.logger.error({
        message: 'Failed to connect to sessionClient',
        url: config.get('redisSessionUri'),
        error: String(err),
      })
    })

  /**
   * Client to redis cache for rate limiting transactional requests
   */
  public rateLimitClient = redis
    .createClient({
      enable_offline_queue: false,
      url: config.get('redisRateLimitUri') || undefined,
    })
    .on('connect', () => {
      this.logger.info({
        message: 'rateLimitClient: Connected',
        url: config.get('redisRateLimitUri'),
      })
    })
    .on('error', (err: Error) => {
      this.logger.error({
        message: 'Failed to connect to rateLimitClient',
        url: config.get('redisRateLimitUri'),
        error: String(err),
      })
    })

  /**
   * Client to redis cache for storing credentials
   */
  public credentialClient = redis
    .createClient({
      url: config.get('redisCredentialUri') || undefined,
    })
    .on('connect', () => {
      this.logger.info({
        message: 'credentialClient: Connected',
        url: config.get('redisCredentialUri'),
      })
    })
    .on('error', (err: Error) => {
      this.logger.error({
        message: 'Failed to connect to credentialClient',
        url: config.get('redisCredentialUri'),
        error: String(err),
      })
    })
  /**
   * Shutdown all redis clients
   */
  public async shutdown(): Promise<void> {
    const clients = [
      this.otpClient,
      this.sessionClient,
      this.rateLimitClient,
      this.credentialClient,
    ]
    await Promise.all(
      clients.map((client) => new Promise((resolve) => client.quit(resolve)))
    )
    await new Promise((resolve) => setImmediate(resolve))
  }
}
