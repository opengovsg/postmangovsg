import { Campaign, ChannelType, Status } from 'classes'
import { sendCampaign, setCampaignToSaveList } from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

export const confirmSendCampaign = async ({
  campaignId,
  sendRate,
  channelType,
  updateCampaign,
  shouldSaveList,
}: {
  campaignId: number
  sendRate: number
  channelType: ChannelType
  updateCampaign: (campaign: Partial<Campaign>) => void
  shouldSaveList: boolean
}) => {
  await setCampaignToSaveList(campaignId, shouldSaveList)
  await sendCampaign(campaignId, sendRate)
  if (sendRate) {
    sendUserEvent(GA_USER_EVENTS.USE_SEND_RATE, channelType)
  }
  updateCampaign({ status: Status.Sending })
}
