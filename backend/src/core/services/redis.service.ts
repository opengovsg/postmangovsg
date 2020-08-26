import redis from 'redis'
import config from '@core/config'
import logger from '@core/logger'

/**
 * Client to redis cache for storing otps
 */
const otpClient = redis
  .createClient({ url: config.get('redisOtpUri') || undefined })
  .on('connect', () => {
    logger.info('otpClient: Connected')
  })
  .on('error', (err: Error) => {
    logger.error(String(err))
  })

/**
 * Client to redis cache for storing sessions
 */
const sessionClient = redis
  .createClient({ url: config.get('redisSessionUri') || undefined })
  .on('connect', () => {
    logger.info('sessionClient: Connected')
  })
  .on('error', (err: Error) => {
    logger.error(String(err))
  })

export const RedisService = {
  otpClient,
  sessionClient,
}
