import axios from 'axios'
import { Campaign, CampaignStats, ChannelType, Status, SMSCampaign, EmailCampaign } from 'classes'

// for dev use
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function getCampaigns(): Promise<Array<Campaign>> {
  return axios.get('/campaigns').then((response) => {
    const campaigns: Campaign[] = response.data.map((data: any) => {
      return new Campaign(data)
    })
    return campaigns
  })
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

export async function getCampaignDetails(campaignId: number): Promise<EmailCampaign | SMSCampaign> {
  return axios.get(`/campaign/${campaignId}`).then((response) => {
    const { campaign, num_recipients: numRecipients } = response.data

    const details = { ...campaign, 'num_recipients': numRecipients }

    switch (campaign.type) {
      case ChannelType.SMS:
        return new SMSCampaign(details)
      case ChannelType.Email:
        return new EmailCampaign(details)
      default:
        throw new Error('Invalid channel type')
    }
  })
}

export async function createCampaign(name: string, type: ChannelType): Promise<Campaign> {
  return axios.post('/campaigns', { name, type }).then(
    (response) => {
      return new Campaign(response.data)
    })
}

export async function sendCampaign(campaignId: number): Promise<boolean> {
  return axios.post(`/campaign/${campaignId}/send`).then((response) => response.status === 200)
}

export async function stopCampaign(campaignId: number): Promise<boolean> {
  return axios.post(`/campaign/${campaignId}/stop`).then((response) => response.status === 200)
}

export async function retryCampaign(campaignId: number): Promise<boolean> {
  return axios.post(`/campaign/${campaignId}/retry`).then((response) => response.status === 200)
}
export async function getPreviewMessage(campaignId: number) {
  return 'something hola'
}
