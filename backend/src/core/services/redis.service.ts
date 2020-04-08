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