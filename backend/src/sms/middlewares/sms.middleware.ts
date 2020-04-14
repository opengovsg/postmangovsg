import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { Campaign } from '@core/models'
import { ChannelType } from '@core/constants'
import { TwilioCredentials } from '@sms/interfaces'
import logger from '@core/logger'
import { dbService, secretsService } from '@core/services'
import { TwilioService } from '@sms/services' 

// Move this to env var
const SALT = '$2b$10$tC8FcAwKXzJDjLV7k.U7NO'

const saveCredential = async (name: string, secret: string) => {
  // Upload the credential to aws secret manager
  await secretsService.storeSecret(name, secret)
  // Store credential to credential table
  await dbService.insertIntoCredentialsTable(name)
}

const getCredential = (req: Request): TwilioCredentials => {
  const { twilioAccountSid, twilioApiKey, twilioApiSecret, twilioMessagingServiceSid } = req.body
  const credential : TwilioCredentials = {
    accountSid: twilioAccountSid,
    apiKey: twilioApiKey, 
    apiSecret: twilioApiSecret,
    messagingServiceSid: twilioMessagingServiceSid
  }
  return credential
}

const hash = (value: string) : Promise<string> => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(value, SALT, (error, hash) => {
      if (error) {
        logger.error(`Failed to hash value: ${error}`)
        reject(error)
      }
      resolve(hash as string)
    })
  }) 
}

const sendMessage = async (recipient: string, credential: TwilioCredentials) : Promise<boolean> => {
  const msg = 'You have successfully verified your Twilio credentials with Postman.'
  logger.info('Sending sms using Twilio.')
  const twilioClient = new TwilioService(credential)
  const isSendSuccessful = await twilioClient.send(recipient, msg)
  return isSendSuccessful
}

// TODO
const isSmsCampaignOwnedByUser = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    const { id: userId } = req.session?.user
    const campaign = await Campaign.findOne({ where: { id: +campaignId, userId, type: ChannelType.SMS } })
    return campaign ? next() : res.sendStatus(400)
  }catch(err){
    return next(err)
  }
}

// Read file from s3 and populate messages table
const storeCredentials = async (req: Request, res: Response): Promise<Response | void> => {
  const credential: TwilioCredentials = getCredential(req)
  // Send test message
  const { testNumber } = req.body
  const isMessageSent = await sendMessage(testNumber, credential)
  if (!isMessageSent) res.sendStatus(400)

  const { campaignId } = req.params

  // Save the credentials and update DB
  try {
    const secretString = JSON.stringify(credential)
    const credentialName = await getEncodedHash(secretString)
    await saveCredential(credentialName, secretString)
    await dbService.addCredentialToCampaignTable(campaignId, credentialName)
  }catch(e) {
    logger.error(`Error saving credentials. error=${e}`)
    return res.sendStatus(500)
  }

  res.json({ message: 'OK' })
}

const getEncodedHash = async (secret : string): Promise<string> => {
  const secretHash = await hash(secret)
  return Buffer.from(secretHash).toString('base64')
}

export { isSmsCampaignOwnedByUser, storeCredentials }
