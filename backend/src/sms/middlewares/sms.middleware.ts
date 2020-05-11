import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { literal } from 'sequelize'
import { Campaign, JobQueue, UserCredential } from '@core/models'
import { SmsMessage, SmsTemplate } from '@sms/models'
import { ChannelType } from '@core/constants'
import { TwilioCredentials } from '@sms/interfaces'
import { credentialService } from '@core/services'
import { TwilioService } from '@sms/services'
import config from '@core/config'
import { template } from '@core/services/template.service'
import { CampaignDetails } from '@core/interfaces'

// Parse credentials from request body if provided, else retrieve from aws secrets mgr
const parseCredentials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const {
    'credential': label,
    'twilio_account_sid': accountSid,
    'twilio_api_key': apiKey,
    'twilio_api_secret': apiSecret,
    'twilio_messaging_service_sid': messagingServiceSid,
  } = req.body

  // if credential label not provided, set credentials in res.locals
  if (!label) {
    res.locals.credentials = {
      accountSid,
      apiKey,
      apiSecret,
      messagingServiceSid,
    }
    return next()
  }

  try {
    // if label provided, fetch from aws secrets
    const userId = req.session?.user?.id
    const userCred = await UserCredential.findOne({
      where: {
        userId,
        label,
      },
      attributes: ['credName'],
    })
    if (!userCred) {
      res.status(400).json({ message: 'User credentials cannot be found' })
      return
    }
    const credentials = await credentialService.getTwilioCredentials(userCred.credName)
    res.locals.credentials = credentials
    res.locals.credentialName = userCred.credName
    next()
  } catch (e) {
    next(e)
  }
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

const sendCampaignMessage = async (campaignId: number, recipient: string, credential: TwilioCredentials): Promise<string | void> => {
  const msg = await getHydratedMsg(campaignId)
  if (!msg) throw new Error('No message to send')

  const twilioService = new TwilioService(credential)
  return twilioService.send(recipient, msg)
}

const sendValidationMessage = async (recipient: string, credential: TwilioCredentials): Promise<string | void> => {
  const twilioService = new TwilioService(credential)
  return twilioService.send(recipient, 'Your Twilio credential has been validated.')
}

const isSmsCampaignOwnedByUser = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const userId = req.session?.user?.id
    const campaign = await Campaign.findOne({ where: { id: +campaignId, userId, type: ChannelType.SMS } })
    return campaign ? next() : res.sendStatus(403)
  } catch (err) {
    return next(err)
  }
}

// Sends out a test message.
// If it is successful, stores the twilio credential in AWS secret manager and db
// Set credentialName in res.locals
const validateAndStoreCredentials = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { recipient } = req.body
  const { campaignId } = req.params
  const { credentials, credentialName } = res.locals
  try {
    if (campaignId) {
      // Sends first hydrated message from campaign
      await sendCampaignMessage(+campaignId, recipient, credentials)
    } else {
      // Sends generic validation message if campaignId not specified
      await sendValidationMessage(recipient, credentials)
    }
    // If credentialName exists, credential has already been stored
    if (credentialName) {
      return next()
    }
  }
  catch (err) {
    return res.status(400).json({ message: `${err}` })
  }
  try {
    // Store credentials in AWS secrets manager
    const stringifiedCredential = JSON.stringify(credentials)
    const credentialName = await getEncodedHash(stringifiedCredential)
    await credentialService.storeCredential(credentialName, stringifiedCredential)
    // Pass on to next middleware/handler
    res.locals.credentialName = credentialName
    res.locals.channelType = ChannelType.SMS
    next()
  } catch (err) {
    return next(err)
  }
}

// Assign credential to campaign
const setCampaignCredential = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { campaignId } = req.params
  const { credentialName } = res.locals
  try {
    if (!credentialName) {
      throw new Error('Credentail does not exist')
    }
    await Campaign.update({
      credName: credentialName,
    }, {
      where: { id: campaignId },
      returning: false,
    })
    return res.json({ message: 'OK' })
  } catch (err) {
    next(err)
  }
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

export {
  parseCredentials,
  isSmsCampaignOwnedByUser,
  validateAndStoreCredentials,
  setCampaignCredential,
  getCampaignDetails,
  previewFirstMessage,
}
