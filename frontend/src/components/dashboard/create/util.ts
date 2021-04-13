import { sendCampaign } from 'services/campaign.service'
import { Campaign, ChannelType, Status } from 'classes'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

export const confirmSendCampaign = async ({
  campaignId,
  sendRate,
  channelType,
  updateCampaign,
}: {
  campaignId: number
  sendRate: number
  channelType: ChannelType
  updateCampaign: (campaign: Partial<Campaign>) => void
}) => {
  await sendCampaign(campaignId, sendRate)
  if (sendRate) {
    sendUserEvent(GA_USER_EVENTS.USE_SEND_RATE, channelType)
  }
  updateCampaign({ status: Status.Sending })
}
