import { Request, Response } from 'express'
import { User } from '@core/models'
import { authenticator } from 'otplib'
import bcrypt from 'bcrypt'
import logger from '@core/logger'
import { HashedOtp } from '../interfaces'
import redis from 'redis'
import config from '@core/config'

const SALT_ROUNDS = 10
const RETRIES = 4 // Number of attempts to enter otp
const EXPIRY_IN_SECONDS = 300 //expires after 5 minutes

// TODO: Move this somewhere else
const createOtpClient = () : redis.RedisClient => {
  return redis.createClient({ url: config.redisOtpUri })
    .on('connect', () => {
      logger.info('otpClient: Connected')
    })
    .on('error', (err: Error) => {
      logger.error(String(err))
    })
}

// TODO: Move this to a loader or sth
const otpClient : redis.RedisClient = createOtpClient()

const getOtp = async (_req: Request, res: Response): Promise<Response> => {
  const email = _req.body.email // TODO: use lodash to be safer?
  // TODO: Exit if there is existing hash and it is not expired
  const otp = generateOtp()
  const hashValue = await hash(otp)
  const hashedOtp : HashedOtp = { hash: hashValue, retries: RETRIES, createdAt: (new Date()).getTime() }
  await saveHashedOtp(email, hashedOtp)
  return res.sendStatus(200)
}

const verifyOtp = async (req: Request, res: Response): Promise<Response> => {
  if(req.session){
    const [user] = await User.findCreateFind({ where: { email: 'test@test.gov.sg' } })
    req.session.user = { id: user.id }
  }
  return res.sendStatus(200)
}

const generateOtp = () : string => {
  return authenticator.generate(authenticator.generateSecret())
}

const hash = (value: string) : Promise<string> => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(value, SALT_ROUNDS, (error, hash) => {
      if (error) {
        logger.error(`Failed to hash value: ${error}`)
        reject(error)
      }
      resolve(hash as string)
    })
  }) 
}

const saveHashedOtp = (email : string, hashedOtp : HashedOtp) :Promise<boolean> => {
  return new Promise((resolve, reject) => {
    otpClient.set(email, JSON.stringify(hashedOtp), 'EX', EXPIRY_IN_SECONDS, (error) => {
      if (error) {
        logger.error(`Failed to save hashed otp: ${error}`)
        reject(error)
      }
      resolve(true)
    })
  })
}

const getHashedOtp = (email: string) : Promise<HashedOtp> => {
  return new Promise((resolve, reject) => {
    otpClient.get(email, (error, value) => {
      if (error) {
        logger.error(`Failed to get hashed otp: ${error}`)
        reject(new Error('Internal server error - request for otp again'))
      }
      if (value === null) {
        reject(new Error('No otp found - request for otp again'))
      }
      resolve(JSON.parse(value))
    })
  })
}
export { getOtp, verifyOtp }