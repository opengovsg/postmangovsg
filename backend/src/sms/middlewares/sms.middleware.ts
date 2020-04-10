import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { Campaign } from '@core/models'
import { ChannelType } from '@core/constants'
import { TwilioCredentials } from '@sms/interfaces'
import logger from '@core/logger'
import { secretsService } from '@core/services'

const SALT_ROUNDS = 10

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
const storeCredentials = async (req: Request, res: Response): Promise<void> => {
  const { twilioAccountSid, twilioApiKey, twilioApiSecret, twilioMessagingServiceSid, testNumber } = req.body
  //TODO: Send test message
  console.log(testNumber)
  await saveCredential({ 
    accountSid: twilioAccountSid,
    apiKey: twilioApiKey, 
    apiSecret: twilioApiSecret,
    messagingServiceSid: twilioMessagingServiceSid
  })

  res.json({ message: 'OK' })
}

const saveCredential = async (credential : TwilioCredentials) => {
  const secretString: string = JSON.stringify(credential)
  // Hash the credential string
  const secretHash = await hash(secretString)
  console.log(secretHash)
  // Upload the credential to aws secret manager
  await secretsService.storeSecret(secretHash, secretString)
  // Store credential to credential table
  // Update credential of the campaign
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


export { isSmsCampaignOwnedByUser, storeCredentials }
