import { authenticator } from 'otplib'
import bcrypt from 'bcrypt'
import { Request } from 'express'
import config from '@core/config'
import logger from '@core/logger'
import { User } from '@core/models'
import { validateDomain } from '@core/utils/validate-domain'
import { RedisService, ApiKeyService, MailService } from '@core/services'
import { HashedOtp, VerifyOtpInput } from '@core/interfaces'

const SALT_ROUNDS = 10 // bcrypt default
const {
  retries: OTP_RETRIES,
  expiry: OTP_EXPIRY,
  resendTimeout: OTP_RESEND_TIMEOUT,
} = config.get('otp')

/**
 * Generate a six digit otp
 */
const generateOtp = (): string => {
  return authenticator.generate(authenticator.generateSecret())
}

/**
 * Save hashed otp against the user's email
 * @param email
 * @param hashedOtp
 */
const saveHashedOtp = (
  email: string,
  hashedOtp: HashedOtp
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    RedisService.otpClient.set(
      email,
      JSON.stringify(hashedOtp),
      'EX',
      OTP_EXPIRY,
      (error) => {
        if (error) {
          logger.error(`Failed to save hashed otp: ${error}`)
          reject(error)
        }
        resolve(true)
      }
    )
  })
}

/**
 * Get the hashed otp that was saved against the user's email
 * @param email
 */
const getHashedOtp = (email: string): Promise<HashedOtp> => {
  return new Promise((resolve, reject) => {
    RedisService.otpClient.get(email, (error, value) => {
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

/**
 * Delete the hashed otp that was saved against the user's email
 * @param email
 */
const deleteHashedOtp = async (email: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    RedisService.otpClient.del(email, (error, response) => {
      if (error || response !== 1) {
        logger.error(`Failed to delete hashed otp: ${error}`)
        reject(error)
      }
      resolve(true)
    })
  })
}

/**
 * Checks that sufficient time has elapsed since the last send of an otp for that email
 * @param email
 */
const hasWaitTimeElapsed = async (email: string): Promise<void> => {
  const existingHash: HashedOtp | null = await getHashedOtp(email).catch(() => {
    // If there is no hash, just proceed
    return null
  })

  // Check that at least WAIT_IN_SECONDS has elapsed before allowing the resend of a new otp
  if (existingHash) {
    const remainingTime = Math.ceil(
      (existingHash.createdAt +
        OTP_RESEND_TIMEOUT * 1000 -
        new Date().getTime()) /
        1000
    )
    if (remainingTime > 0)
      throw new Error(
        `Wait for ${remainingTime} seconds before requesting for a new otp`
      )
  }
}

/**
 * Checks that email belongs to a whitelisted domain, or has been inserted manually in the database
 * @param email
 */
const isWhitelistedEmail = async (email: string): Promise<boolean> => {
  const endsInWhitelistedDomain = validateDomain(email)
  if (!endsInWhitelistedDomain) {
    // If the email does not end in a whitelisted domain, check that it was  whitelisted by us manually
    const user = await User.findOne({
      where: { email: email },
    })
    if (user === null) throw new Error('No user was found with this email')
  }
  return true
}

/**
 * Extracts api key from Authorization bearer token
 * @param req
 */
const getApiKey = (req: Request): string | null => {
  const headerKey = 'Bearer'
  const authHeader = req.get('authorization')
  if (!authHeader) return null

  const [header, apiKey] = authHeader.split(' ')
  if (headerKey !== header) return null

  const [name, version, key] = apiKey.split('_')
  if (!name || !version || !key) return null

  return apiKey
}

/**
 * Finds if the supplied api key is associated with a user
 * @param req
 */
const getUserForApiKey = async (req: Request): Promise<User | null> => {
  const apiKey = getApiKey(req)
  if (apiKey !== null) {
    const hash = await ApiKeyService.getApiKeyHash(apiKey)
    const user = await User.findOne({
      where: { apiKey: hash },
      attributes: ['id'],
    })
    return user
  }
  return null
}

/**
 * Checks that a valid cookie has been sent with  the request
 * @param req
 */
const checkCookie = (req: Request): boolean => {
  return req.session?.user?.id !== undefined
}

/**
 * Checks whether to send an otp to the email
 * @param email
 * @throws error if email is not whitelisted, or user has to wait for some time before requesting an otp
 */
const canSendOtp = async (email: string): Promise<void> => {
  await isWhitelistedEmail(email)
  await hasWaitTimeElapsed(email)
}

/**
 * Sends an email containing the otp to the user
 * @param email
 */
const sendOtp = async (email: string): Promise<string | void> => {
  const otp = generateOtp()
  const hashValue = await bcrypt.hash(otp, SALT_ROUNDS)
  const hashedOtp: HashedOtp = {
    hash: hashValue,
    retries: OTP_RETRIES,
    createdAt: Date.now(),
  }
  await saveHashedOtp(email, hashedOtp)

  return MailService.mailClient.sendMail({
    recipients: [email],
    subject: `One-Time Password (OTP) for ${config.get('APP_NAME')}`,
    body: `Your OTP is <b>${otp}</b>. It will expire in ${Math.floor(
      OTP_EXPIRY / 60
    )} minutes.
    Please use this to login to your ${config.get(
      'APP_NAME'
    )} account. <p>If your OTP does not work, please request for a new OTP.</p>`,
  })
}

/**
 *  Checks that user's otp input is correct, and authorizes them if so.
 * @param input
 */
const verifyOtp = async (input: VerifyOtpInput): Promise<boolean> => {
  try {
    const hashedOtp: HashedOtp = await getHashedOtp(input.email)
    const authorized: boolean = await bcrypt.compare(input.otp, hashedOtp.hash)
    if (authorized) {
      await deleteHashedOtp(input.email)
      return true
    }
    hashedOtp.retries -= 1
    // if there is at least 1 retry, save the hashedOtp
    if (hashedOtp.retries > 0) {
      await saveHashedOtp(input.email, hashedOtp)
    } else {
      await deleteHashedOtp(input.email)
    }
    return false
  } catch (e) {
    logger.error(e)
    return false
  }
}

/**
 * Helper method to find or create a user by their email
 * @param email
 */
const findOrCreateUser = async (email: string): Promise<User> => {
  const [user] = await User.findCreateFind({ where: { email: email } })
  return user
}

/**
 * Helper method to find a user by their id
 * @param id
 */
const findUser = (id: number): Promise<User> => {
  return User.findOne({
    where: { id },
  })
}

export const AuthService = {
  canSendOtp,
  sendOtp,
  verifyOtp,
  findOrCreateUser,
  findUser,
  checkCookie,
  getUserForApiKey,
}
