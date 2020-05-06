import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { literal } from 'sequelize'
import { Campaign, JobQueue } from '@core/models'
import { SmsMessage, SmsTemplate } from '@sms/models'
import { ChannelType } from '@core/constants'
import { TwilioCredentials } from '@sms/interfaces'
import { credentialService } from '@core/services'
import { TwilioService } from '@sms/services'
import config from '@core/config'
import { template } from '@core/services/template.service'
import { CampaignDetails } from '@core/interfaces'


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
  const {
    'twilio_account_sid': accountSid,
    'twilio_api_key': apiKey,
    'twilio_api_secret': apiSecret,
    'twilio_messaging_service_sid': messagingServiceSid,
  } = req.body
  const credential: TwilioCredentials = {
    accountSid,
    apiKey,
    apiSecret,
    messagingServiceSid,
  }
  return credential
}

const getParams = async (campaignId: number): Promise<{ [key: string]: string } | null> => {
  const smsMessage = await SmsMessage.findOne({ where: { campaignId }, attributes: ['params'] })
  if (smsMessage === null) return null
  return smsMessage.params as { [key: string]: string }
}

const getSmsBody = async (campaignId: number): Promise<string | null> => {
  const smsTemplate = await SmsTemplate.findOne({ where: { campaignId }, attributes: ['body'] })
  if (smsTemplate === null) return null
  return smsTemplate.body as string
}

const getEncodedHash = async (secret: string): Promise<string> => {
  const secretHash = await bcrypt.hash(secret, config.aws.secretManagerSalt)
  return Buffer.from(secretHash).toString('base64')
}

const getHydratedMsg = async (campaignId: number): Promise<string | null> => {
  const params = await getParams(campaignId)
  const body = await getSmsBody(campaignId)
  if (params === null || body === null) return null

  const hydratedMsg = template(body, params)
  return hydratedMsg
}

const sendMessage = async (campaignId: number, recipient: string, credential: TwilioCredentials): Promise<string | void> => {
  const msg = await getHydratedMsg(campaignId)
  if (!msg) throw new Error('No message to send')

  const twilioService = new TwilioService(credential)
  return twilioService.send(recipient, msg)
}

const isSmsCampaignOwnedByUser = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const userId = req.session?.user?.id 
    const campaign = await Campaign.findOne({ where: { id: +campaignId, userId, type: ChannelType.SMS } })
    return campaign ? next() : res.sendStatus(400)
  } catch (err) {
    return next(err)
  }
}

// Sends out a test message.
// If it is successful, stores the twilio credential in AWS secret manager and db, as well as updating the campaign table.
const storeCredentials = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const credential: TwilioCredentials = getCredential(req)
  // Send test message
  const { recipient } = req.body
  const { campaignId } = req.params
  try {
    await sendMessage(+campaignId, recipient, credential)
  }
  catch (err) {
    return res.status(400).json({ message: `${err}` })
  }

  // Save the credentials and update DB
  try {
    const secretString = JSON.stringify(credential)
    const credentialName = await getEncodedHash(secretString)
    await saveCredential(+campaignId, credentialName, secretString)
  } catch (err) {
    return next(err)
  }
  return res.json({ message: 'OK' })
}


const getCampaignDetails = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const campaign: CampaignDetails = (await Campaign.findOne({
      where: { id: +campaignId },
      attributes: [
        'id', 'name', 'type', 'created_at', 'valid',
        [literal('CASE WHEN "cred_name" IS NULL THEN False ELSE True END'), 'has_credential'],
        [literal('s3_object -> \'filename\''), 'csv_filename'],
      ],
      include: [
        {
          model: JobQueue,
          attributes: ['status', ['created_at', 'sent_at']],
        },
        {
          model: SmsTemplate,
          attributes: ['body', 'params'],
        }],
    }))?.get({ plain: true }) as CampaignDetails

    const numRecipients: number = await SmsMessage.count(
      {
        where: { campaignId: +campaignId },
      }
    )
    // TODO: Why is numRecipients not part of campaign?
    return res.json({ campaign, 'num_recipients': numRecipients })
  } catch (err) {
    return next(err)
  }
}

const previewFirstMessage = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    return res.json({
      preview: {
        body: await getHydratedMsg(+campaignId),
      },
    })
  } catch (err) {
    return next(err)
  }
}

export { isSmsCampaignOwnedByUser, storeCredentials, getCampaignDetails, previewFirstMessage }
