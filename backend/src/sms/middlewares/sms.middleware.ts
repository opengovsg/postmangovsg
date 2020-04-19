import { Request, Response, NextFunction } from 'express'
import { literal } from 'sequelize'
import { Campaign, JobQueue } from '@core/models'
import { SmsMessage, SmsTemplate } from '@sms/models'
import { ChannelType } from '@core/constants'
import { TwilioCredentials } from '@sms/interfaces'
import logger from '@core/logger'
import { credentialService, hashService } from '@core/services'
import { TwilioService } from '@sms/services'
import config from '@core/config'


const saveCredential = async (campaignId: number, credentialName: string, secret: string): Promise<void> => {
  // Check if credential is already in the credential table
  const credentialExists = await credentialService.isExistingCredential(credentialName)

  // If credential doesnt already exist
  if (!credentialExists) {
    // Upload the credential to aws secret manager
    await credentialService.storeSecret(credentialName, secret)  
  }
  // Store credential to credential table and update campaign
  await credentialService.addCredentialToCampaign(campaignId, credentialName)

}

const getCredential = (req: Request): TwilioCredentials => {
  const { twilioAccountSid, twilioApiKey, twilioApiSecret, twilioMessagingServiceSid } = req.body
  const credential: TwilioCredentials = {
    accountSid: twilioAccountSid,
    apiKey: twilioApiKey, 
    apiSecret: twilioApiSecret,
    messagingServiceSid: twilioMessagingServiceSid,
  }
  return credential
}

const sendMessage = (recipient: string, credential: TwilioCredentials): Promise<string | void> => {
  const msg = 'You have successfully verified your Twilio credentials with Postman.'
  logger.info('Sending sms using Twilio.')
  const twilioService = new TwilioService(credential)
  return twilioService.send(recipient, msg)
}

const getEncodedHash = async (secret: string): Promise<string> => {
  const secretHash = await hashService.specifySalt(secret, config.aws.secretManagerSalt)
  return Buffer.from(secretHash).toString('base64')
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

// Sends out a test message. 
// If it is successful, stores the twilio credential in AWS secret manager and db, as well as updating the campaign table.
const storeCredentials = async (req: Request, res: Response,  next: NextFunction): Promise<Response | void> => {
  const credential: TwilioCredentials = getCredential(req)
  // Send test message
  const { testNumber } = req.body
  try {
    await sendMessage(testNumber, credential)
  }
  catch(err){
    return res.status(400).json({ message: err })
  }

  const { campaignId } = req.params
  // Save the credentials and update DB
  try {
    const secretString = JSON.stringify(credential)
    const credentialName = await getEncodedHash(secretString)
    await saveCredential(+campaignId, credentialName, secretString)
  }catch(err) {
    return next(err)
  }
  return res.json({ message: 'OK' })
}


const getCampaignDetails = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try{
    const { campaignId } = req.params
    const campaign: Campaign | null =  await Campaign.findOne({ 
      where: { id: +campaignId }, 
      attributes: [
        'id', 'name', 'type', 'created_at', 'valid', [literal('CASE WHEN "cred_name" IS NULL THEN False ELSE True END'), 'has_credential'],
      ],
      include: [
        {
          model: JobQueue,
          attributes: ['status'],
        },
        {
          model: SmsTemplate,
          attributes: ['body'],
        }],
    })
    const numRecipients: number = await SmsMessage.count(
      {
        where: { campaignId: +campaignId },
      }
    )
    return res.json({ campaign, 'num_recipients': numRecipients })
  }catch(err){
    return next(err)
  }
}
export { isSmsCampaignOwnedByUser, storeCredentials, getCampaignDetails }
