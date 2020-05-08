import bcrypt from 'bcrypt'
import { SmsMessage, SmsTemplate } from '@sms/models'
import config from '@core/config'
import { TemplateService } from '@core/services'
import { TwilioCredentials } from '@sms/interfaces'
import { TwilioService } from '.'
import { ChannelType } from '@core/constants'
import { Campaign, JobQueue } from '@core/models'
import { GetCampaignDetailsOutput, CampaignDetails } from '@core/interfaces'
import { literal } from 'sequelize'

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
  
const getHydratedMessage = async (campaignId: number): Promise<string | null> => {
  const params = await getParams(campaignId)
  const body = await getSmsBody(campaignId)
  if (params === null || body === null) return null
  
  const hydratedMsg = TemplateService.template(body, params)
  return hydratedMsg
}
  
const sendCampaignMessage = async (campaignId: number, recipient: string, credential: TwilioCredentials): Promise<string | void> => {
  const msg = await getHydratedMessage(campaignId)
  if (!msg) throw new Error('No message to send')
  
  const twilioService = new TwilioService(credential)
  return twilioService.send(recipient, msg)
}

const sendValidationMessage = async (recipient: string, credential: TwilioCredentials): Promise<string | void> => {
  const twilioService = new TwilioService(credential)
  return twilioService.send(recipient, 'Your Twilio credential has been validated.')
}

const findCampaign = (campaignId: number, userId: number): Promise<Campaign> => {
  return Campaign.findOne({ where: { id: +campaignId, userId, type: ChannelType.SMS } })
}

const setCampaignCredential = (campaignId: number, credentialName: string): Promise<[number, Campaign[]]> => {
  return Campaign.update({
    credName: credentialName,
  }, {
    where: { id: campaignId },
    returning: false,
  })
}

const getCampaignDetails = async (campaignId: number): Promise<GetCampaignDetailsOutput> => {
  const campaignDetails: CampaignDetails = (await Campaign.findOne({
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
  return { campaign: campaignDetails, numRecipients }
}
  
export const SmsService = {
  getEncodedHash,
  findCampaign,
  getCampaignDetails,
  getHydratedMessage,
  sendCampaignMessage,
  sendValidationMessage,
  setCampaignCredential,
}
