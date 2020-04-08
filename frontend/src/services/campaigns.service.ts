import axios from 'axios'

import { Campaign, SMSCampaign, ChannelType, Status } from 'classes'

// for dev use
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function getCampaignDetails(campaignId: number): Promise<Campaign> {
  await sleep(1000)
  return Promise.resolve(new SMSCampaign({
    id: campaignId,
    name: 'Project Name',
    type: ChannelType.SMS,
    status: Status.Draft,
    createdAt: Date.now(),
    hasCredentials: false,
    body: 'something',
  }))
}