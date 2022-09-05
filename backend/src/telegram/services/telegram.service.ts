import { Transaction } from 'sequelize'

import config from '@core/config'
import { ChannelType } from '@core/constants'
import { Campaign } from '@core/models'
import { CampaignDetails } from '@core/interfaces'

import {
  TelegramMessage,
  TelegramTemplate,
  BotSubscriber,
  TelegramSubscriber,
} from '@telegram/models'
import { TelegramTemplateService } from '@telegram/services'

import TelegramClient from './telegram-client.class'
import { CSVParams } from '@core/types'
import {
  CampaignService,
  PhoneNumberService,
  UploadService,
} from '@core/services'
import { loggerWithLabel } from '@core/logger'
import { TelegramDuplicateCampaignDetails } from '@telegram/interfaces'
import { MessageBulkInsertInterface } from '@core/interfaces/message.interface'

const logger = loggerWithLabel(module)

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
  // get telegram template
  const template = await TelegramTemplateService.getFilledTemplate(campaignId)

  // Get params
  const params = await getParams(campaignId)
  if (params === null || template === null) return null

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const body = TelegramTemplateService.client.template(
    template?.body as string,
    params
  )
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
  phoneNumber = PhoneNumberService.normalisePhoneNumber(
    phoneNumber,
    config.get('defaultCountry')
  )

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
    throw new Error(`Invalid token. ${(err as Error).message}`)
  }

  const callbackUrl = `${config.get(
    'telegramOptions.webhookUrl'
  )}/${telegramBotToken}`
  await telegramService.registerCallbackUrl(callbackUrl)

  const commands = [
    { command: 'updatenumber', description: 'Update linked phone number' },
    { command: 'help', description: 'Get help' },
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
  }) as Promise<Campaign>
}

/**
 * Update the credential column for the campaign with the specified credential
 * @param campaignId
 * @param credentialName
 */
const setCampaignCredential = (
  campaignId: number,
  credentialName: string
): Promise<[number]> => {
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
  return await CampaignService.getCampaignDetails(campaignId, [
    {
      model: TelegramTemplate,
      attributes: ['body', 'params'],
    },
  ])
}

const uploadCompleteOnPreview = ({
  transaction,
  template,
  campaignId,
}: {
  transaction: Transaction
  template: TelegramTemplate
  campaignId: number
}): ((data: CSVParams[]) => Promise<void>) => {
  return async (data: CSVParams[]): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    UploadService.checkTemplateKeysMatch(data, template.params!)

    TelegramTemplateService.testHydration(
      [{ params: data[0] }],
      template.body as string
    )
    // delete message_logs entries
    await TelegramMessage.destroy({
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

    // NOTE FOR TELEGRAM: Validate the phone number before insertion because this service
    // must have correctly formatted phone number before enqueue.

    // Append default country code as telegram handler stores number with the country
    // code by default.
    const formattedRecords =
      TelegramTemplateService.validateAndFormatNumber(records)
    // START populate template
    await TelegramMessage.bulkCreate(
      formattedRecords as Array<TelegramMessage>,
      {
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
      }
    )
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
          model: TelegramTemplate,
          attributes: ['body'],
        },
      ],
    })
  )?.get({ plain: true }) as unknown as TelegramDuplicateCampaignDetails

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
        if (duplicate && campaign.telegram_templates) {
          const template = campaign.telegram_templates
          // Even if a campaign did not have an associated saved template, it can still be duplicated
          await TelegramTemplate.create(
            {
              campaignId: duplicate.id,
              body: template.body,
            } as TelegramTemplate,
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

export const TelegramService = {
  findCampaign,
  getCampaignDetails,
  setCampaignCredential,
  sendValidationMessage,
  sendCampaignMessage,
  getHydratedMessage,
  validateAndConfigureBot,
  uploadCompleteOnPreview,
  uploadCompleteOnChunk,
  duplicateCampaign,
}
