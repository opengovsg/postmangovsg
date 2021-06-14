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

const close = async (): Promise<void> => {
  console.log('close')
  const closeOtpClient = new Promise<void>((resolve) => {
    otpClient.quit(() => {
      console.log('otp quit')
      resolve()
    })
  })

  const closeSessionClient = new Promise<void>((resolve) => {
    sessionClient.quit(() => {
      console.log('sess quit')
      resolve()
    })
  })

  await Promise.all([closeOtpClient, closeSessionClient])

  // redis.quit() creates a thread to close the connection.
  // We wait until all threads have been run once to ensure the connection closes.
  await new Promise((resolve) => setImmediate(resolve))
}

export const RedisService = {
  otpClient,
  sessionClient,
  close,
}
