import { Campaign, Status } from 'classes'
import {
  cancelScheduledCampaign,
  sendCampaign,
} from 'services/campaign.service'

export const confirmSendCampaign = async ({
  campaignId,
  sendRate,
  updateCampaign,
  scheduledTiming,
}: {
  campaignId: number
  sendRate: number
  updateCampaign: (campaign: Partial<Campaign>) => void
  scheduledTiming?: Date
}) => {
  await sendCampaign(campaignId, sendRate, scheduledTiming)
  updateCampaign({
    status: scheduledTiming ? Status.Scheduled : Status.Sending,
    scheduledAt: scheduledTiming,
  })
}

export const confirmCancelScheduledCampaign = async ({
  campaignId,
  updateCampaign,
}: {
  campaignId: number
  updateCampaign: (campaign: Partial<Campaign>) => void
}) => {
  await cancelScheduledCampaign(campaignId).then(() => {
    updateCampaign({
      status: Status.Draft,
    })
  })

  return
}

const formUrl = 'https://form.gov.sg/6465cefc1e7d8b0012576d6a'
const emailFieldId = '6357af36c23cd700125f9d7c'
export const campaignFeedbackUrl = `${formUrl}?${emailFieldId}=`
