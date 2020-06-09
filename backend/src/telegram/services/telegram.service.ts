import { literal } from 'sequelize'

import config from '@core/config'
import { ChannelType } from '@core/constants'
import { Campaign, JobQueue } from '@core/models'
import { GetCampaignDetailsOutput, CampaignDetails } from '@core/interfaces'

import { TelegramMessage, TelegramTemplate } from '@telegram/models'
import { TelegramTemplateService } from '@telegram/services'

import TelegramClient from './telegram-client.class'

/**
 * Validate and configure Telegram bot
 * @param telegramBotToken
 * @throws Error when either the token is invalid or the configuration
 *   for the bot failed.
 */
const validateAndConfigureBot = async (
  telegramBotToken: string
): Promise<void> => {
  const telegramService = new TelegramClient(telegramBotToken)
  try {
    await telegramService.getBotInfo()
  } catch (err) {
    throw new Error(`Invalid token. ${err.message}`)
  }

  const callbackUrl = config.get('telegramOptions.webhookUrl')
  await telegramService.registerCallbackUrl(callbackUrl)

  const commands = [
    { command: 'updatenumber', description: 'Update linked phone number' },
  ]
  await telegramService.setCommands(commands)
}

/**
 *  Sends a stock sms to the campaign admin using the associated credentials
 * @param recipient
 * @param credential
 */
const sendValidationMessage = async (
  recipient: string,
  telegramBotToken: string
): Promise<number> => {
  const telegramService = new TelegramClient(telegramBotToken)
  return telegramService.send(
    recipient,
    'Your Twilio credential has been validated.'
  )
}

/**
 *  Helper method to find a telegram campaign owned by that user
 * @param campaignId
 * @param userId
 */
const findCampaign = (
  campaignId: number,
  userId: number
): Promise<Campaign> => {
  return Campaign.findOne({
    where: { id: +campaignId, userId, type: ChannelType.Telegram },
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
    { credName: credentialName },
    {
      where: { id: campaignId },
      returning: false,
    }
  )
}

/**
 * Gets details of a campaign and the number of recipients that have been uploaded for this campaign
 * @param campaignId
 */
const getCampaignDetails = async (
  campaignId: number
): Promise<GetCampaignDetailsOutput> => {
  const campaignDetails: CampaignDetails = (
    await Campaign.findOne({
      where: { id: +campaignId },
      attributes: [
        'id',
        'name',
        'type',
        'created_at',
        'valid',
        [
          literal('CASE WHEN "cred_name" IS NULL THEN False ELSE True END'),
          'has_credential',
        ],
        [literal("s3_object -> 'filename'"), 'csv_filename'],
      ],
      include: [
        {
          model: JobQueue,
          attributes: ['status', ['created_at', 'sent_at']],
        },
        {
          model: TelegramTemplate,
          attributes: ['body', 'params'],
        },
      ],
    })
  )?.get({ plain: true }) as CampaignDetails

  const numRecipients: number = await TelegramMessage.count({
    where: { campaignId: +campaignId },
  })
  return { campaign: campaignDetails, numRecipients }
}

/**
 * Gets a message's parameters
 * @param campaignId
 */
const getParams = async (
  campaignId: number
): Promise<{ [key: string]: string } | null> => {
  const telegramMessage = await TelegramMessage.findOne({
    where: { campaignId },
    attributes: ['params'],
  })
  if (telegramMessage === null) return null
  return telegramMessage.params as { [key: string]: string }
}

/**
 * Replaces template's attributes with a message's parameters to return the hydrated message
 * @param campaignId
 */
const getHydratedMessage = async (
  campaignId: number
): Promise<{ body: string } | null> => {
  // get sms template
  const template = await TelegramTemplateService.getFilledTemplate(campaignId)

  // Get params
  const params = await getParams(campaignId)
  if (params === null || template === null) return null

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const body = TelegramTemplateService.client.template(template?.body!, params)
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  return { body }
}

export const TelegramService = {
  findCampaign,
  getCampaignDetails,
  setCampaignCredential,
  sendValidationMessage,
  getHydratedMessage,
  validateAndConfigureBot,
}
