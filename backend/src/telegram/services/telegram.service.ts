import { literal } from 'sequelize'

import config from '@core/config'
import { ChannelType } from '@core/constants'
import { Campaign, JobQueue } from '@core/models'
import { CampaignDetails } from '@core/interfaces'

import {
  TelegramMessage,
  TelegramTemplate,
  BotSubscriber,
  TelegramSubscriber,
} from '@telegram/models'
import { TelegramTemplateService } from '@telegram/services'

import TelegramClient from './telegram-client.class'

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

/**
 * Retrieve telegramId for given phone number and bot id
 * @param phoneNumber
 * @param botId
 */
const getSubscriberTelegramId = async (
  phoneNumber: string,
  botId: string
): Promise<number> => {
  // Append default country code if does not exists.
  if (!phoneNumber.startsWith('+') && config.get('defaultCountryCode')) {
    phoneNumber = `+${config.get('defaultCountryCode')}${phoneNumber}`
  }

  const subscriber = await TelegramSubscriber.findOne({
    where: { phoneNumber },
    include: [
      {
        model: BotSubscriber,
        where: { botId },
      },
    ],
  })
  if (!subscriber) {
    throw new Error('Recipient is not subscribed to the bot.')
  }

  return subscriber.telegramId
}

/**
 * Send a stock Telegram message to recpient
 * @param recpient
 * @param telegramBotToken
 */
const sendValidationMessage = async (
  recipient: string,
  telegramBotToken: string
): Promise<number | void> => {
  const [botId] = telegramBotToken.split(':')
  const telegramId = await getSubscriberTelegramId(recipient, botId)

  const telegramService = new TelegramClient(telegramBotToken)
  return telegramService.send(
    telegramId,
    'Your Telegram credential has been validated.'
  )
}

/**
 *  Sends a templated Telegram message to the campaign admin using the
 *  associated credentials
 * @param campaignId
 * @param recipient
 * @param telegramBotToken
 * @throws Error if it cannot send a Telegram message
 */
const sendCampaignMessage = async (
  campaignId: number,
  recipient: string,
  telegramBotToken: string
): Promise<number | void> => {
  const msg = await getHydratedMessage(campaignId)
  if (!msg) throw new Error('No message to send')

  const [botId] = telegramBotToken.split(':')
  const telegramId = await getSubscriberTelegramId(recipient, botId)

  const telegramService = new TelegramClient(telegramBotToken)
  return telegramService.send(telegramId, msg?.body)
}

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
): Promise<CampaignDetails> => {
  const [campaignDetails, numRecipients] = await Promise.all([
    Campaign.findOne({
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
    }),
    TelegramMessage.count({
      where: { campaignId },
    }),
  ])

  return {
    ...campaignDetails?.get({ plain: true }),
    num_recipients: numRecipients,
  } as CampaignDetails
}

export const TelegramService = {
  findCampaign,
  getCampaignDetails,
  setCampaignCredential,
  sendValidationMessage,
  sendCampaignMessage,
  getHydratedMessage,
  validateAndConfigureBot,
}
