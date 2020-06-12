import axios from 'axios'
import {
  Campaign,
  CampaignStats,
  ChannelType,
  Status,
  SMSCampaign,
  EmailCampaign,
} from 'classes'

function getSentAt(jobs: Array<{ sent_at: Date }>): Date {
  const jobsSentAt = jobs.map((x) => x.sent_at).sort()
  // returns job with the earliest sentAt time
  return jobsSentAt[0]
}

export async function getCampaigns(params: {
  offset: number
  limit: number
}): Promise<{
  campaigns: Array<Campaign>
  totalCount: number
}> {
  return axios.get('/campaigns', { params }).then((response) => {
    const { campaigns, total_count } = response.data
    const campaignList: Campaign[] = campaigns.map((data: any) => {
      const details = {
        ...data,
        sent_at: getSentAt(data.job_queue),
      }

      return new Campaign(details)
    })

    return {
      campaigns: campaignList,
      totalCount: total_count,
    }
  })
}

function parseStatus(status: string): Status {
  switch (status) {
    case 'LOGGED':
      return Status.Sent
    case 'READY':
    case 'ENQUEUED':
    case 'SENDING':
    case 'SENT':
    case 'STOPPED':
      return Status.Sending
    default:
      return Status.Draft
  }
}

export async function getCampaignStats(
  campaignId: number
): Promise<CampaignStats> {
  return axios.get(`/campaign/${campaignId}/stats`).then((response) => {
    const { status, ...counts } = response.data
    return new CampaignStats({
      ...counts,
      status: parseStatus(status),
    })
  })
}

export async function getCampaignDetails(
  campaignId: number
): Promise<EmailCampaign | SMSCampaign> {
  return axios.get(`/campaign/${campaignId}`).then((response) => {
    const campaign = response.data
    const details = {
      ...campaign,
      sent_at: getSentAt(campaign.job_queue),
    }

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

export async function createCampaign(
  name: string,
  type: ChannelType,
  protect: boolean
): Promise<Campaign> {
  return axios.post('/campaigns', { name, type, protect }).then((response) => {
    return new Campaign(response.data)
  })
}

export async function sendCampaign(
  campaignId: number,
  sendRate: number
): Promise<void> {
  const body = sendRate ? { rate: sendRate } : null
  await axios.post(`/campaign/${campaignId}/send`, body)
}

export async function stopCampaign(campaignId: number): Promise<void> {
  await axios.post(`/campaign/${campaignId}/stop`)
}

export async function retryCampaign(campaignId: number): Promise<void> {
  await axios.post(`/campaign/${campaignId}/retry`)
}
