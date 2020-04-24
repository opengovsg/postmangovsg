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
import { template } from '@core/services/template.service'


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

const getParams = async (campaignId: string): Promise<{[key: string]: string} | null> => {
  const smsMessage = await SmsMessage.findOne({ where: { campaignId }, attributes: ['params'] })
  if (smsMessage === null) return null
  return smsMessage.params as {[key: string]: string}
}

const getSmsBody = async (campaignId: string): Promise<string | null> => {
  const smsTemplate = await SmsTemplate.findOne({ where: { campaignId }, attributes: ['body'] })
  if (smsTemplate === null) return null
  return smsTemplate.body as string
}

const getEncodedHash = async (secret: string): Promise<string> => {
  const secretHash = await hashService.specifySalt(secret, config.aws.secretManagerSalt)
  return Buffer.from(secretHash).toString('base64')
}

const getHydratedMsg = async (campaignId: string): Promise<string | null>  => {
  const params = await getParams(campaignId)
  const body = await getSmsBody(campaignId)
  if (params === null || body === null ) return null

  const hydratedMsg = template(body, params)
  return hydratedMsg
}

const sendMessage = async (campaignId: string, recipient: string, credential: TwilioCredentials): Promise<string | void> => {
  const msg = await getHydratedMsg(campaignId)
  if (!msg) return

  logger.info('Sending sms using Twilio.')
  const twilioService = new TwilioService(credential)
  return twilioService.send(recipient, msg)
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
  const { recipient } = req.body
  const { campaignId } = req.params
  try {
    await sendMessage(campaignId, recipient, credential)
  }
  catch(err){
    logger.error(err)
    return res.status(400).json({ message: `${err}` })
  }

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
