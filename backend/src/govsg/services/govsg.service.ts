import { ChannelType } from '@core/constants'
import { CampaignDetails } from '@core/interfaces'
import { Campaign } from '@core/models'
import { CampaignService } from '@core/services'
import { CampaignGovsgTemplate } from '@govsg/models/campaign-govsg-template'
import { GovsgTemplate } from '@govsg/models/govsg-template'

export async function getCampaignDetails(
  campaignId: number
): Promise<CampaignDetails> {
  return CampaignService.getCampaignDetails(campaignId, [
    { model: GovsgTemplate, attributes: ['body', 'params'] },
  ])
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
