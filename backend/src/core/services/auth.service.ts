import { customAlphabet } from 'nanoid'
import bcrypt from 'bcrypt'
import { Request } from 'express'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { User } from '@core/models'
import { validateDomain } from '@core/utils/validate-domain'
import { ApiKeyService, MailService, RedisService } from '@core/services'
import { HashedOtp, VerifyOtpInput } from '@core/interfaces'
import { Transaction } from 'sequelize/types'
import {
  SgidClient,
  UserInfoReturn,
  generatePkcePair,
} from '@opengovsg/sgid-client'
import { SgidPublicOfficerEmployment } from '@core/types'

export interface AuthService {
  canSendOtp(email: string): Promise<void>
  sendOtp(email: string, ipAddress: string): Promise<void>
  verifyOtp(input: VerifyOtpInput): Promise<boolean>
  findOrCreateUser(email: string): Promise<User>
  findUser(id: number): Promise<User>
  checkCookie(req: Request): boolean
  getUserForApiKey(req: Request): Promise<User | null>
  getSgidUrl(req: Request): string
  verifySgidCode(
    req: Request,
    code: string
  ): Promise<
    | { authenticated: true; data: UserInfoReturn }
    | { authenticated: false; reason: string }
  >
  getSgidUserProfiles(userInfo: UserInfoReturn): SgidPublicOfficerEmployment[]
}

export const InitAuthService = (redisService: RedisService): AuthService => {
  const logger = loggerWithLabel(module)
  const SALT_ROUNDS = 10 // bcrypt default
  const {
    retries: OTP_RETRIES,
    expiry: OTP_EXPIRY,
    resendTimeout: OTP_RESEND_TIMEOUT,
  } = config.get('otp')

  const {
    clientId: SGID_CLIENT_ID,
    clientSecret: SGID_CLIENT_SECRET,
    privateKey: SGID_PRIVATE_KEY,
    redirectUri: SGID_REDIRECT_URI,
  } = config.get('sgid')

  const sgidClient = new SgidClient({
    clientId: SGID_CLIENT_ID,
    clientSecret: SGID_CLIENT_SECRET,
    privateKey: SGID_PRIVATE_KEY,
    redirectUri: SGID_REDIRECT_URI,
  })

  const SGID_PUBLIC_OFFICER_EMPLOYMENT_SCOPE =
    'pocdex.public_officer_employments'
  const SGID_FIELD_EMPTY = 'NA'
  const otpCharset = '234567ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  /**
   * Generate a six digit otp
   */
  const generateOtp = customAlphabet(otpCharset, 6)

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
      redisService.otpClient.set(
        email,
        JSON.stringify(hashedOtp),
        'EX',
        OTP_EXPIRY,
        (error) => {
          if (error) {
            logger.error({
              message: 'Failed to save hashed otp',
              email,
              error,
              action: 'saveHashedOtp',
            })
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
    const logMeta = { email, action: 'getHashedOtp' }
    return new Promise((resolve, reject) => {
      redisService.otpClient.get(email, (error, value) => {
        if (error) {
          logger.error({
            message: 'Failed to get hashed otp',
            error,
            ...logMeta,
          })
          reject(new Error('Internal server error - request for otp again'))
        }
        if (value === null) {
          reject(new Error('OTP has expired. Please request for a new OTP.'))
        }
        resolve(JSON.parse(value as string))
      })
    })
  }

  /**
   * Delete the hashed otp that was saved against the user's email
   * @param email
   */
  const deleteHashedOtp = async (email: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      redisService.otpClient.del(email, (error, response) => {
        if (error || response !== 1) {
          logger.error({
            message: 'Failed to delete hashed otp',
            email,
            error,
            response,
            action: 'deleteHashedOtp',
          })
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
    const existingHash: HashedOtp | null = await getHashedOtp(email).catch(
      () => {
        // If there is no hash, just proceed
        return null
      }
    )

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
    const endsInWhitelistedDomain = await validateDomain(email)
    if (!endsInWhitelistedDomain) {
      // If the email does not end in a whitelisted domain, check that it was  whitelisted by us manually
      const user = await User.findOne({ where: { email: email } })
      if (user === null) throw new Error('User is not authorized')
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
    if (headerKey !== header || !apiKey) return null

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
    if (!apiKey) {
      return null
    }
    const hash = await ApiKeyService.getApiKeyHash(apiKey)
    const apiKeyRecord = await ApiKeyService.getApiKeyRecord(hash)

    if (!apiKeyRecord) {
      return null
    }
    return await User.findOne({
      where: { id: apiKeyRecord.userId },
      attributes: ['id', 'email', ['rate_limit', 'rateLimit']],
    })
  }

  /**
   * Checks that a valid cookie has been sent with the request
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
   * @param ipAddress originating IP address that requests for OTP.
   */
  const sendOtp = async (email: string, ipAddress: string): Promise<void> => {
    const otp = generateOtp()
    const hashValue = await bcrypt.hash(otp, SALT_ROUNDS)
    const hashedOtp: HashedOtp = {
      hash: hashValue,
      retries: OTP_RETRIES,
      createdAt: Date.now(),
    }
    await saveHashedOtp(email, hashedOtp)

    const appName = config.get('APP_NAME')
    void MailService.mailClient.sendMail({
      from: config.get('mailFrom'),
      recipients: [email],
      subject: `One-Time Password (OTP) for ${appName} - ${otp}`,
      body: `Your OTP is <b>${otp}</b>. It will expire in ${Math.floor(
        OTP_EXPIRY / 60
      )} minutes.
    Please use this to login to your ${appName} account. <p>If your OTP does not work, please request for a new OTP.</p>
    <p>This login attempt was made from the IP: ${ipAddress}. If you did not attempt to log in to ${appName}, you may choose to investigate this IP address further.</p>
    <p>The ${appName} Support Team</p>`,
    })
  }

  /**
   *  Checks that user's otp input is correct, and authorizes them if so.
   * @param input
   */
  const verifyOtp = async (input: VerifyOtpInput): Promise<boolean> => {
    const logMeta = { email: input.email, action: 'verifyOtp' }
    try {
      const hashedOtp: HashedOtp = await getHashedOtp(input.email)
      const authorized: boolean = await bcrypt.compare(
        input.otp,
        hashedOtp.hash
      )
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
        logger.info({
          message: 'No otp retries left, deleting otp',
          ...logMeta,
        })
      }
      return false
    } catch (e) {
      logger.error({
        message: 'Error occurred while verifying otp',
        error: e,
        ...logMeta,
      })
      return false
    }
  }

  /**
   * Helper method to find or create a user by their email
   * @param email
   */
  const findOrCreateUser = async (email: string): Promise<User> => {
    const result = await User.sequelize?.transaction(async (t: Transaction) => {
      const [user] = await User.findOrCreate({
        where: { email: email },
        transaction: t,
      })
      return user
    })
    if (!result) throw new Error('Unable to find or create user')

    return result
  }

  /**
   * Helper method to find a user by their id
   * @param id
   */
  const findUser = (id: number): Promise<User> => {
    return User.findOne({
      where: { id },
    }) as Promise<User>
  }

  /**
   * Get the sgID authorization url to redirect the user to
   * @param req
   */
  const getSgidUrl = (req: Request): string => {
    const { codeChallenge, codeVerifier } = generatePkcePair()

    const { url, nonce } = sgidClient.authorizationUrl({
      scope: ['openid', SGID_PUBLIC_OFFICER_EMPLOYMENT_SCOPE].join(' '),
      codeChallenge,
    })

    if (!req.session) {
      throw new Error('Unable to find user session')
    }

    req.session.sgid = {
      codeVerifier,
      nonce,
    }

    return url
  }

  /**
   * Checks the user's sgID code and returns their singpass info if valid
   * @param req
   * @param code
   */
  const verifySgidCode = async (
    req: Request,
    code: string
  ): Promise<
    | { authenticated: true; data: UserInfoReturn }
    | { authenticated: false; reason: string }
  > => {
    if (!req.session || !req.session.sgid) {
      throw new Error('Unable to find user session')
    }
    const { codeVerifier, nonce } = req.session.sgid

    if (typeof codeVerifier !== 'string' || typeof nonce !== 'string') {
      throw new Error('Invalid parameter types')
    }

    try {
      const { accessToken, sub } = await sgidClient.callback({
        code,
        codeVerifier,
        nonce,
      })

      const userinfo = await sgidClient.userinfo({
        accessToken,
        sub,
      })

      return {
        authenticated: true,
        data: userinfo,
      }
    } catch (e) {
      return {
        authenticated: false,
        reason: (e as Error).message,
      }
    }
  }

  /**
   * Helper method to retrieve the user's valid profiles from their singpass info.
   * @param userInfo
   */
  const getSgidUserProfiles = (
    userInfo: UserInfoReturn
  ): SgidPublicOfficerEmployment[] => {
    const profiles = JSON.parse(
      userInfo.data[SGID_PUBLIC_OFFICER_EMPLOYMENT_SCOPE]
    ) as SgidPublicOfficerEmployment[]
    const validProfiles = validateSgidUserProfiles(profiles)
    const cleanedProfiles = cleanSgidUserProfiles(validProfiles)
    return cleanedProfiles
  }

  /**
   * Helper method to validate the user's profiles returned by SGID.
   * A profile is valid only if the user's work email exists and is whitelisted by Postman
   * @param userProfiles
   */
  const validateSgidUserProfiles = (
    userProfiles: SgidPublicOfficerEmployment[]
  ): SgidPublicOfficerEmployment[] => {
    const logMeta = { action: 'validateSgidUserProfiles' }
    // Only the value of workEmail is important for access to Postman.
    const validProfiles = userProfiles.filter((profile) => {
      // We want to log the absence of workEmail to measure the data completeness from SGID.
      if (profile.workEmail === SGID_FIELD_EMPTY) {
        logger.warn({
          message: 'Work email is missing from SGID data',
          ...logMeta,
          profile,
        })
        return false
      }
      if (!isWhitelistedEmail(profile.workEmail)) {
        logger.warn({
          message: 'Work email is not a whitelisted email',
          ...logMeta,
          profile,
        })
        return false
      }
      return true
    })
    return validProfiles
  }

  /**
   * Helper method to clean the user's profiles returned by SGID
   * @param userProfiles
   */
  const cleanSgidUserProfiles = (
    userProfiles: SgidPublicOfficerEmployment[]
  ): SgidPublicOfficerEmployment[] => {
    const logMeta = { action: 'cleanSgidUserProfiles' }
    const cleanedProfiles = userProfiles.map((profile) => {
      // DB only accepts lowercase emails
      profile.workEmail = profile.workEmail.toLowerCase()
      // If SGID does not have the field, we want to log the missing value and return an empty string
      if (profile.agencyName === SGID_FIELD_EMPTY) {
        profile.agencyName = ''
        logger.warn({
          message: 'Agency name is missing from SGID data',
          ...logMeta,
          profile,
        })
      }
      if (profile.departmentName === SGID_FIELD_EMPTY) {
        profile.departmentName = ''
        logger.warn({
          message: 'Department name is missing from SGID data',
          ...logMeta,
          profile,
        })
      }
      if (profile.employmentTitle === SGID_FIELD_EMPTY) {
        profile.employmentTitle = ''
        logger.warn({
          message: 'Employment title is missing from SGID data',
          ...logMeta,
          profile,
        })
      }
      if (profile.employmentType === SGID_FIELD_EMPTY) {
        profile.employmentType = ''
        logger.warn({
          message: 'Employment type is missing from SGID data',
          ...logMeta,
          profile,
        })
      }
      return profile
    })
    return cleanedProfiles
  }

  return {
    canSendOtp,
    sendOtp,
    verifyOtp,
    findOrCreateUser,
    findUser,
    checkCookie,
    getUserForApiKey,
    getSgidUrl,
    verifySgidCode,
    getSgidUserProfiles,
  }
}
