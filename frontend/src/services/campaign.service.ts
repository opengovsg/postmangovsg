import axios from 'axios'
import {
  Campaign,
  CampaignStats,
  ChannelType,
  Status,
  SMSCampaign,
  EmailCampaign,
  TelegramCampaign,
  CampaignRecipient,
} from 'classes'
import moment from 'moment'

function getJobTimestamps(
  jobs: Array<{ sent_at: Date; status_updated_at: Date }>
): { sentAt: Date; statusUpdatedAt: Date } {
  const jobsSentAt = jobs.map((x) => x.sent_at).sort()
  const jobsUpdatedAt = jobs.map((x) => x.status_updated_at).sort()
  // returns job with the earliest sentAt time
  return { sentAt: jobsSentAt[0], statusUpdatedAt: jobsUpdatedAt[0] }
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
      const { sentAt, statusUpdatedAt } = getJobTimestamps(data.job_queue)
      const details = {
        ...data,
        sentAt,
        statusUpdatedAt,
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
  campaignId: number,
  forceRefresh = false
): Promise<CampaignStats> {
  if (forceRefresh) {
    return axios
      .post(`/campaign/${campaignId}/refresh-stats`)
      .then((response) => {
        const { status, updatedAt, ...counts } = response.data
        return new CampaignStats({
          ...counts,
          status: parseStatus(status),
          updatedAt,
        })
      })
  }

  return axios.get(`/campaign/${campaignId}/stats`).then((response) => {
    const { status, updatedAt, ...counts } = response.data
    return new CampaignStats({
      ...counts,
      status: parseStatus(status),
      updatedAt,
    })
  })
}

export async function getCampaignDetails(
  campaignId: number
): Promise<EmailCampaign | SMSCampaign | TelegramCampaign> {
  return axios.get(`/campaign/${campaignId}`).then((response) => {
    const campaign = response.data
    const { sentAt } = getJobTimestamps(campaign.job_queue)
    const details = {
      ...campaign,
      sentAt,
    }

    switch (campaign.type) {
      case ChannelType.SMS:
        return new SMSCampaign(details)
      case ChannelType.Email:
        return new EmailCampaign(details)
      case ChannelType.Telegram:
        return new TelegramCampaign(details)
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

export async function exportCampaignStats(
  campaignId: number
): Promise<Array<CampaignRecipient>> {
  return axios.get(`/campaign/${campaignId}/export`).then((response) => {
    const campaignRecipients = response.data?.map(
      (record: any) => new CampaignRecipient(record)
    )
    for (const campaignRecipient of campaignRecipients) {
      campaignRecipient.updatedAt = moment(campaignRecipient.updatedAt)
        .format('LLL')
        .replace(',', '')
    }
    return campaignRecipients
  })
}
