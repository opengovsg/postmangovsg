import redis from 'redis'
import config from '@core/config'
import logger from '@core/logger'

if (!config.redisOtpUri) {
  throw new Error('otpClient: redisOtpUri not found')
}

export const otpClient = 
  redis.createClient({ url: config.redisOtpUri })
    .on('connect', () => {
      logger.info('otpClient: Connected')
    })
    .on('error', (err: Error) => {
      logger.error(String(err))
    })

if (!config.redisSessionUri) {
  throw new Error('sessionClient: redisSessionUri not found')
}

export const sessionClient = 
  redis.createClient({ url: config.redisSessionUri })
    .on('connect', () => {
      logger.info('sessionClient: Connected')
    })
    .on('error', (err: Error) => {
      logger.error(String(err))
    })