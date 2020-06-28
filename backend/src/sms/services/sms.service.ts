import bcrypt from 'bcrypt'

import config from '@core/config'

import { ChannelType } from '@core/constants'
import { Campaign } from '@core/models'
import { CampaignDetails } from '@core/interfaces'
import { CampaignService } from '@core/services'

import { SmsMessage, SmsTemplate } from '@sms/models'
import { SmsTemplateService } from '@sms/services'
import { TwilioCredentials } from '@sms/interfaces'

import TwilioClient from './twilio-client.class'

/**
 * Gets a message's parameters
 * @param campaignId
 */
const getParams = async (
  campaignId: number
): Promise<{ [key: string]: string } | null> => {
  const smsMessage = await SmsMessage.findOne({
    where: { campaignId },
    attributes: ['params'],
  })
  if (smsMessage === null) return null
  return smsMessage.params as { [key: string]: string }
}

/**
 * Replaces template's attributes with a message's parameters to return the hydrated message
 * @param campaignId
 */
const getHydratedMessage = async (
  campaignId: number
): Promise<{ body: string } | null> => {
  // get sms template
  const template = await SmsTemplateService.getFilledTemplate(campaignId)

  // Get params
  const params = await getParams(campaignId)
  if (params === null || template === null) return null

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const body = SmsTemplateService.client.template(template?.body!, params)
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  return { body }
}

/**
 *  Sends a templated sms to the campaign admin using the associated credentials
 * @param campaignId
 * @param recipient
 * @param credential
 * @throws Error if it cannot send an sms
 */
const sendCampaignMessage = async (
  campaignId: number,
  recipient: string,
  credential: TwilioCredentials
): Promise<string | void> => {
  const msg = await getHydratedMessage(campaignId)
  if (!msg) throw new Error('No message to send')

  const twilioService = new TwilioClient(credential)
  return twilioService.send(recipient, msg?.body)
}

/**
 *  Sends a stock sms to the campaign admin using the associated credentials
 * @param recipient
 * @param credential
 */
const sendValidationMessage = async (
  recipient: string,
  credential: TwilioCredentials
): Promise<string | void> => {
  const twilioService = new TwilioClient(credential)
  return twilioService.send(
    recipient,
    'Your Twilio credential has been validated.'
  )
}

/**
 *  Helper method to find an sms campaign owned by that user
 * @param campaignId
 * @param userId
 */
const findCampaign = (
  campaignId: number,
  userId: number
): Promise<Campaign> => {
  return Campaign.findOne({
    where: { id: +campaignId, userId, type: ChannelType.SMS },
  })
}

/**
 * Update the credential column for the campaign with the specified credential
 * @param campaignId
 * @param credentialName
 */
const setCampaignCredential = (
  campaignId: number,
  credentialName: string
): Promise<[number, Campaign[]]> => {
  return Campaign.update(
    {
      credName: credentialName,
    },
    {
      where: { id: campaignId },
      returning: false,
    }
  )
}

/**
 * Gets details of a campaign
 * @param campaignId
 */
const getCampaignDetails = async (
  campaignId: number
): Promise<CampaignDetails> => {
  return await CampaignService.getCampaignDetails(campaignId, [
    {
      model: SmsTemplate,
      attributes: ['body', 'params'],
    },
  ])
}

/**
 * Returns a base 64 encoded hash for secrets manager
 * @param secret
 */
const getEncodedHash = async (secret: string): Promise<string> => {
  const secretHash = await bcrypt.hash(
    secret,
    config.get('aws.secretManagerSalt')
  )
  return Buffer.from(secretHash).toString('base64')
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
