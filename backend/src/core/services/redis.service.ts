import redis from 'redis'
import config from '@core/config'
import logger from '@core/logger'


const createOtpClient = () : redis.RedisClient => {
  return redis.createClient({ url: config.redisOtpUri })
    .on('connect', () => {
      logger.info('otpClient: Connected')
    })
    .on('error', (err: Error) => {
      logger.error(String(err))
    })
}

const otpClient : redis.RedisClient = createOtpClient()

export { otpClient }