import { ChannelType, DefaultCredentialName } from '@core/constants'
import { CampaignDetails } from '@core/interfaces'
import { Campaign } from '@core/models'
import { CampaignService, StatsService, UploadService } from '@core/services'
import { CSVParams } from '@core/types'
import { CampaignGovsgTemplate } from '@govsg/models/campaign-govsg-template'
import { GovsgTemplate } from '@govsg/models/govsg-template'
import { Transaction } from 'sequelize'
import { GovsgTemplateService } from '.'
import { GovsgMessage } from '@govsg/models/govsg-message'
import { MessageBulkInsertInterface } from '@core/interfaces/message.interface'
import { loggerWithLabel } from '@core/logger'
import { WhatsAppLanguages } from '@shared/clients/whatsapp-client.class/types'
import { GovsgVerification } from '@govsg/models'
import { createPasscode } from '@govsg/utils/passcode'
import config from '@core/config'

const logger = loggerWithLabel(module)

export async function getCampaignDetails(
  campaignId: number
): Promise<CampaignDetails | null> {
  const [campaign, pivot] = await Promise.all([
    CampaignService.getCampaignDetails(campaignId, []),
    CampaignGovsgTemplate.findOne({
      where: { campaignId },
      include: {
        model: GovsgTemplate,
        attributes: [
          'id',
          'body',
          'params',
          'param_metadata',
          'multilingualSupport',
        ],
      },
    }),
  ])
  return {
    ...campaign,
    govsg_templates: pivot
      ? {
          ...(pivot.govsgTemplate.toJSON() as any), // any to get around the snake vs camel casing difference between TS type and actual db table field
          for_single_recipient: pivot.forSingleRecipient,
          languages: pivot.govsgTemplate.multilingualSupport.map(
            (languageSupport) => ({
              ...languageSupport,
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              code: languageSupport.language_code,
            })
          ),
        }
      : undefined,
  }
}

export const findCampaign = (
  campaignId: number,
  userId?: number
): Promise<Campaign> =>
  Campaign.findOne({
    where: { id: +campaignId, userId, type: ChannelType.Govsg },
  }) as Promise<Campaign>

export async function duplicateCampaign({
  campaignId,
  name,
}: {
  campaignId: number
  name: string
}): Promise<Campaign | void> {
  const [campaign, pivot] = await Promise.all([
    Campaign.findOne({ where: { id: campaignId } }),
    CampaignGovsgTemplate.findOne({ where: { campaignId } }),
  ])
  if (!campaign || !Campaign.sequelize) {
    return
  }

  return Campaign.sequelize.transaction(async (transaction) => {
    const duplicate = await CampaignService.createCampaign({
      name,
      type: campaign.type,
      userId: campaign.userId,
      protect: campaign.protect,
      demoMessageLimit: campaign.demoMessageLimit,
      transaction,
    })
    if (duplicate && pivot) {
      await CampaignGovsgTemplate.create(
        {
          campaignId: duplicate.id,
          govsgTemplateId: pivot.govsgTemplateId,
          forSingleRecipient: pivot.forSingleRecipient,
        } as CampaignGovsgTemplate,
        { transaction }
      )
    }
    return duplicate
  })
}

export function uploadCompleteOnPreview({
  transaction,
  template,
  campaignId,
}: {
  transaction: Transaction
  template: GovsgTemplate
  campaignId: number
}): (data: CSVParams[]) => Promise<void> {
  return async function (data: CSVParams[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    UploadService.checkTemplateKeysMatch(data, template.params!)

    GovsgTemplateService.testHydration(
      [{ params: data[0] }],
      template.body as string
    )
    await GovsgMessage.destroy({
      where: { campaignId },
      transaction,
    })
  }
}

const getLanguageCode = (language: string | undefined) => {
  if (!language) {
    return WhatsAppLanguages.english
  }
  const languageInLowerCase = language.toLowerCase()
  const whatsAppLanguages = Object.keys(WhatsAppLanguages)
  const key = whatsAppLanguages.find(
    (whatsAppLanguage) => whatsAppLanguage.toLowerCase() === languageInLowerCase
  )
  if (!key) {
    return WhatsAppLanguages.english
  }
  return WhatsAppLanguages[key as keyof typeof WhatsAppLanguages]
}

const isTemplateWithPasscode = async (govsgMessage: GovsgMessage) => {
  const campaignId = govsgMessage.campaignId
  const campaignGovsgTemplate = await CampaignGovsgTemplate.findOne({
    where: {
      campaignId,
    },
    include: [Campaign, GovsgTemplate],
  })
  return (
    campaignGovsgTemplate?.govsgTemplate.whatsappTemplateLabel ===
    config.get('whatsapp.precallTemplateLabel')
  )
}

export function uploadCompleteOnChunk({
  transaction,
  campaignId,
}: {
  transaction: Transaction
  campaignId: number
}): (data: CSVParams[]) => Promise<void> {
  return async function (data: CSVParams[]): Promise<void> {
    const recipients = new Set<string>([])
    const records: Array<MessageBulkInsertInterface> = data.map((entry) => {
      const keysWithMissingValues = Object.keys(entry).filter((k) => !entry[k])
      if (keysWithMissingValues.length > 0) {
        throw new Error(
          `One or more rows have missing data for ${keysWithMissingValues.join(
            ', '
          )}`
        )
      }
      const recipient = entry.recipient.trim()
      if (recipients.has(recipient)) {
        throw new Error(
          `Duplicate recipient: ${recipient}. Duplicate recipients are not acceptable in Gov.sg campaigns.`
        )
      }
      recipients.add(recipient)
      return {
        campaignId,
        recipient: recipient,
        params: entry,
        languageCode: getLanguageCode(entry.language),
      }
    })

    const govsgMessages = await GovsgMessage.bulkCreate(
      records as Array<GovsgMessage>,
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
        returning: true,
      }
    )
    if (!govsgMessages.length) {
      return
    }
    // All govsg messages grouped in bulk-send use the same message template, so it is enough to check isTemplateWithPasscode on any one message.
    const govsgMessage = govsgMessages[0]
    const shouldHavePasscode = await isTemplateWithPasscode(govsgMessage)
    if (shouldHavePasscode) {
      await GovsgVerification.bulkCreate(
        govsgMessages.map(
          (message) =>
            ({
              govsgMessageId: message.id,
              passcode: createPasscode(),
            } as GovsgVerification)
        ),
        { transaction }
      )
    }
  }
}

export async function setDefaultCredentials(
  campaignId: number
): Promise<number> {
  const [updatedCount] = await Campaign.update(
    { credName: DefaultCredentialName.Govsg },
    {
      where: {
        id: campaignId,
      },
    }
  )
  return updatedCount
}

export async function processSingleRecipientCampaign(
  data: Record<string, string>,
  languageCode: string,
  campaignId: number
): Promise<void> {
  const transaction = await GovsgMessage.sequelize?.transaction()
  try {
    await GovsgMessage.destroy({
      where: { campaignId },
      transaction,
    })
    const govsgMessage = await GovsgMessage.create(
      {
        campaignId,
        recipient: data.recipient,
        languageCode,
        params: data,
      } as GovsgMessage,
      { transaction, returning: true }
    )
    const shouldHavePasscode = await isTemplateWithPasscode(govsgMessage)
    if (shouldHavePasscode) {
      const passcode = createPasscode()
      const dataWithPasscode = { ...data, passcode }
      const govsgMessage = await GovsgMessage.create(
        {
          campaignId,
          recipient: data.recipient,
          languageCode,
          params: dataWithPasscode,
        } as GovsgMessage,
        { transaction, returning: true }
      )
      await GovsgVerification.create(
        {
          govsgMessageId: govsgMessage.id,
          passcode,
        } as GovsgVerification,
        { transaction }
      )
    } else {
      await GovsgMessage.create(
        {
          campaignId,
          recipient: data.recipient,
          languageCode,
          params: data,
        } as GovsgMessage,
        { transaction, returning: true }
      )
    }
    await StatsService.setNumRecipients(campaignId, 1, transaction)
    await CampaignService.setValid(campaignId, transaction)
    await transaction?.commit()
  } catch (e) {
    await transaction?.rollback()
  }
}
