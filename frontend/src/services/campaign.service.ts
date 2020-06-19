import axios from 'axios'
import {
  Campaign,
  CampaignStats,
  ChannelType,
  Status,
  SMSCampaign,
  EmailCampaign,
  CampaignInvalidRecipients,
} from 'classes'

const EXPORT_LINK_DISPLAY_WAIT_TIME = 5 * 60 * 1000

function getJobTimestamps(
  jobs: Array<{ sent_at: Date; status_updated_at: Date }>
): { sentAt: Date; statusUpdatedAt: Date } {
  const jobsSentAt = jobs.map((x) => x.sent_at).sort()
  const jobsUpdatedAt = jobs.map((x) => x.status_updated_at).sort()
  // returns job with the earliest sentAt time
  return { sentAt: jobsSentAt[0], statusUpdatedAt: jobsUpdatedAt[0] }
}

export async function hasFailedRecipients(
  campaignId: number,
  status: Status,
  updatedAt: Date,
  count?: number
) {
  if (status !== Status.Sent) {
    return false
  }

  const updatedAtTimestamp = +new Date(updatedAt)
  const campaignAge = Date.now() - updatedAtTimestamp
  if (campaignAge <= EXPORT_LINK_DISPLAY_WAIT_TIME) {
    return false
  }

  let failedCount = count
  if (!failedCount) {
    const { error, invalid } = await getCampaignStats(campaignId)
    failedCount = error + invalid
  }
  return failedCount > 0
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
  campaignId: number
): Promise<CampaignStats> {
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
): Promise<EmailCampaign | SMSCampaign> {
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
      default:
        throw new Error('Invalid channel type')
    }
  })
}

export async function createCampaign(
  name: string,
  type: ChannelType
): Promise<Campaign> {
  return axios.post('/campaigns', { name, type }).then((response) => {
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
): Promise<Array<CampaignInvalidRecipients>> {
  return axios.get(`/campaign/${campaignId}/export`).then((response) => {
    return response.data
  })
}
