import bcrypt from 'bcrypt'
import { Transaction } from 'sequelize'

import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { CSVParams } from '@core/types'
import { ChannelType } from '@core/constants'
import { Campaign } from '@core/models'
import { CampaignDetails } from '@core/interfaces'
import { CampaignService, UploadService } from '@core/services'

import { SmsMessage, SmsTemplate } from '@sms/models'
import { SmsTemplateService } from '@sms/services'
import { SmsDuplicateCampaignDetails, TwilioCredentials } from '@sms/interfaces'
import { PhoneNumberService } from '@core/services'

import TwilioClient from './twilio-client.class'

const logger = loggerWithLabel(module)

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
  recipient = PhoneNumberService.normalisePhoneNumber(
    recipient,
    config.get('defaultCountry')
  )
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
  recipient = PhoneNumberService.normalisePhoneNumber(
    recipient,
    config.get('defaultCountry')
  )
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

const uploadCompleteOnPreview = ({
  transaction,
  template,
  campaignId,
}: {
  transaction: Transaction
  template: SmsTemplate
  campaignId: number
}): ((data: CSVParams[]) => Promise<void>) => {
  return async (data: CSVParams[]): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    UploadService.checkTemplateKeysMatch(data, template.params!)

    SmsTemplateService.testHydration(
      [{ params: data[0] }],
      template.body as string
    )
    // delete message_logs entries
    await SmsMessage.destroy({
      where: { campaignId },
      transaction,
    })
  }
}
const uploadCompleteOnChunk = ({
  transaction,
  campaignId,
}: {
  transaction: Transaction
  campaignId: number
}): ((data: CSVParams[]) => Promise<void>) => {
  return async (data: CSVParams[]): Promise<void> => {
    const records: Array<MessageBulkInsertInterface> = data.map((entry) => {
      const { recipient } = entry
      return {
        campaignId,
        recipient: recipient.trim(),
        params: entry,
      }
    })
    // START populate template
    await SmsMessage.bulkCreate(records, {
      transaction,
      logging: (_message, benchmark) => {
        if (benchmark) {
          logger.info({
            message: 'uploadCompleteOnChunk: ElapsedTime in ms',
            benchmark,
            campaignId,
            action: 'uploadCompleteOnChunk',
          })
        }
      },
      benchmark: true,
    })
  }
}

const duplicateCampaign = async ({
  campaignId,
  name,
}: {
  campaignId: number
  name: string
}): Promise<Campaign | void> => {
  const campaign = (
    await Campaign.findByPk(campaignId, {
      attributes: ['type', 'user_id', 'protect', 'demo_message_limit'],
      include: [
        {
          model: SmsTemplate,
          attributes: ['body'],
        },
      ],
    })
  )?.get({ plain: true }) as SmsDuplicateCampaignDetails

  if (campaign) {
    const duplicatedCampaign = await Campaign.sequelize?.transaction(
      async (transaction) => {
        const duplicate = await CampaignService.createCampaign({
          name,
          type: campaign.type,
          userId: campaign.user_id,
          protect: campaign.protect,
          demoMessageLimit: campaign.demo_message_limit,
          transaction,
        })
        if (duplicate && campaign.sms_templates) {
          const template = campaign.sms_templates
          // Even if a campaign did not have an associated saved template, it can still be duplicated
          await SmsTemplate.create(
            {
              campaignId: duplicate.id,
              body: template.body,
            },
            { transaction }
          )
        }
        return duplicate
      }
    )
    return duplicatedCampaign
  }

  return
}

export const SmsService = {
  getEncodedHash,
  findCampaign,
  getCampaignDetails,
  getHydratedMessage,
  sendCampaignMessage,
  sendValidationMessage,
  setCampaignCredential,
  uploadCompleteOnPreview,
  uploadCompleteOnChunk,
  duplicateCampaign,
}
