import { ChannelType } from '@core/constants'
import { CampaignDetails } from '@core/interfaces'
import { Campaign } from '@core/models'
import { CampaignService, UploadService } from '@core/services'
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
      include: { model: GovsgTemplate, attributes: ['id', 'body', 'params'] },
    }),
  ])
  return { ...campaign, govsg_templates: pivot?.govsgTemplate }
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
    const records: Array<MessageBulkInsertInterface> = data.map((entry) => {
      const keysWithMissingValues = Object.keys(entry).filter((k) => !entry[k])
      if (keysWithMissingValues.length > 0) {
        throw new Error(
          `One or more rows have missing data for ${keysWithMissingValues.join(
            ', '
          )}`
        )
      }
      return {
        campaignId,
        recipient: entry.recipient.trim(),
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
