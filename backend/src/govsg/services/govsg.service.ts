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
          languages: pivot.govsgTemplate.multilingualSupport,
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
      }
    })

    await GovsgMessage.bulkCreate(records as Array<GovsgMessage>, {
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
    await GovsgMessage.create({
      campaignId,
      recipient: data.recipient,
      languageCode,
      params: data,
    } as GovsgMessage)
    await StatsService.setNumRecipients(campaignId, 1, transaction)
    await CampaignService.setValid(campaignId, transaction)
    await transaction?.commit()
  } catch (e) {
    await transaction?.rollback()
  }
}
