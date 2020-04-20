import axios from 'axios'
import { Campaign, CampaignStats, ChannelType, Status, SMSCampaign } from 'classes'

// for dev use
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function getCampaigns(): Promise<Array<Campaign>> {
  const campaigns: Array<Campaign> = [
    {
      id: 1,
      type: ChannelType.SMS,
      name: 'test sms',
      createdAt: Date.now(),
      sentAt: Date.now(),
      status: 'sending',
    },
    {
      id: 1,
      type: ChannelType.Email,
      name: 'test email',
      createdAt: Date.now(),
      timeSent: Date.now(),
      status: 'sent',
    },
  ].map((a) => new Campaign(a))
  await sleep(1000)
  return Promise.resolve(campaigns)
}

export async function getCampaignDetails(campaignId: number): Promise<Campaign> {
  await sleep(100)
  return Promise.resolve(new SMSCampaign({
    id: campaignId,
    name: 'Project Name',
    type: ChannelType.SMS,
    status: Status.Sent,
    createdAt: Date.now(),
    hasCredentials: true,
    body: 'something {{ hello }} ',
    numRecipients: 524,
    sentAt: Date.now(),
  }))
}


export async function getCampaignStats(campaignId: number): Promise<CampaignStats> {
  await sleep(100)
  return Promise.resolve(new CampaignStats({
    id: campaignId,
    error: 12,
    invalid: 10,
    unsent: 199,
    sent: 23,
    status: Status.Sending,
  }))
}
