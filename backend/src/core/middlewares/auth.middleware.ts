import { Request, Response } from 'express'
import { authenticator } from 'otplib'
import bcrypt from 'bcrypt'
import redis from 'redis'
// import { User } from '@core/models'
import { HashedOtp, VerifyOtpInput } from '@core/interfaces'
import logger from '@core/logger'
import config from '@core/config'

const SALT_ROUNDS = 10
const RETRIES = 4 // Number of attempts to enter otp
const EXPIRY_IN_SECONDS = 300 //expires after 5 minutes
const WAIT_IN_SECONDS = 30 // Number of seconds to wait before resending otp

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
  await checkPermissionToResend(email)
  const otp = generateOtp()
  const hashValue = await hash(otp)
  const hashedOtp : HashedOtp = { hash: hashValue, retries: RETRIES, createdAt: (new Date()).getTime() }
  await saveHashedOtp(email, hashedOtp)
  // TODO: send otp to given email
  return res.sendStatus(200)
}

const verifyOtp = async (req: Request, res: Response): Promise<Response> => {
  const { email, otp } = req.body //TODO: use lodash?
  const authorized = await isOtpVerified({ email, otp })
  if (!authorized) {
    return res.sendStatus(401)
  }
  return res.sendStatus(200)

  //TODO: Deal with session
  // if(req.session){
  //   const [user] = await User.findCreateFind({ where: { email: 'test@test.gov.sg' } })
  //   req.session.user = { id: user.id }
  //   return res.sendStatus(200)
  // }
  
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

const checkPermissionToResend = async (email: string) => {
  const existingHash: HashedOtp | null =  await getHashedOtp(email).catch(() => {
    // If there is no hash, just proceed
    return null
  })

  // Check that at least WAIT_IN_SECONDS has elapsed before allowing the resend of a new otp
  if(existingHash){
    const remainingTime = Math.ceil ( (existingHash.createdAt + (WAIT_IN_SECONDS*1000) - (new Date()).getTime()) / 1000 )
    if(remainingTime > 0) throw new Error(`Wait for ${remainingTime} seconds before requesting for a new otp`)
  }
}

const isOtpVerified = async (input: VerifyOtpInput ) : Promise<boolean> => {
  try {
    const hashedOtp: HashedOtp = await getHashedOtp(input.email)
    const authorized: boolean = await bcrypt.compare(input.otp, hashedOtp.hash)
    if (authorized) {
      return true
    }
    hashedOtp.retries -= 1
    // if there is at least 1 retry, save the hashedOtp
    if (hashedOtp.retries > 0) {
      await saveHashedOtp(input.email, hashedOtp)
    }
    else {
      await deleteHashedOtp(input.email)
    }
    return false
  }
  catch (e) {
    logger.error(e)
    return false
  }
}

const deleteHashedOtp = async (email: string) => {
  return new Promise((resolve, reject) => {
    otpClient.del(email, (error, response) => {
      if (error || response !== 1) {
        logger.error(`Failed to delete hashed otp: ${error}`)
        reject(error)
      }
      resolve(true)
    })
  })
}
export { getOtp, verifyOtp }