import redis from 'redis'
import config from '@core/config'
import Logger from '@core/logger'

const logger = Logger.loggerWithLabel(module)

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

export const RedisService = {
  otpClient,
  sessionClient,
}
