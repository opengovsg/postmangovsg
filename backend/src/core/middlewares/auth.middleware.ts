import { Request, Response } from 'express'
import { authenticator } from 'otplib'
import bcrypt from 'bcrypt'
import { User } from '@core/models'
import { HashedOtp, VerifyOtpInput } from '@core/interfaces'
import logger from '@core/logger'
import { otpClient, mailClient } from '@core/services'

const SALT_ROUNDS = 10
const RETRIES = 4 // Number of attempts to enter otp
const EXPIRY_IN_SECONDS = 300 //expires after 5 minutes
const WAIT_IN_SECONDS = 30 // Number of seconds to wait before resending otp

const getOtp = async (req: Request, res: Response): Promise<Response> => {
  const email = req.body.email
  try {
    await closedBetaCheckExistingUser(email) // TODO: remove when launching
    await checkPermissionToResend(email)
  } catch (e) {
    logger.error(`Not allowed to send OTP to. email=${email}`)
    return res.sendStatus(401)
  }
  try {
    const otp = generateOtp()
    const hashValue = await hash(otp)
    const hashedOtp : HashedOtp = { hash: hashValue, retries: RETRIES, createdAt: Date.now() }
    await saveHashedOtp(email, hashedOtp)
    await sendOtp(email, otp)
  } catch (e) {
    logger.error(`Error sending OTP: ${e}. email=${email}`)
    return res.sendStatus(500)
  }
  
  return res.sendStatus(200)
}

const verifyOtp = async (req: Request, res: Response): Promise<Response> => {
  const { email, otp } = req.body
  const authorized = await isOtpVerified({ email, otp })
  if (!authorized) {
    return res.sendStatus(401)
  }  

  if(req.session){
    const [user] = await User.findCreateFind({ where: { email: email } })
    req.session.user = { id: user.id, createdAt: user.createdAt, updatedAt: user.updatedAt }
    return res.sendStatus(200)
  }
  return res.sendStatus(401)
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

// TODO: Remove when launch, checks if it's an existing user
const closedBetaCheckExistingUser = async (email : string) => {
  const user = await User.findOne({ where: { email: email } })
  if (user === null) throw new Error('No user was found with this email')
}

const sendOtp = async (recipient: string, otp: string) => {
  await mailClient.sendMail({
    recipients: [recipient],
    subject: 'One-Time Password (OTP) for Postman.gov.sg',
    body: `Your OTP is <b>${otp}</b>. It will expire in ${Math.floor(EXPIRY_IN_SECONDS / 60)} minutes. 
    Please use this to login to your Postman.gov.sg account. <p>If your OTP does not work, please request for a new OTP.</p>`,
  })
}

export { getOtp, verifyOtp }