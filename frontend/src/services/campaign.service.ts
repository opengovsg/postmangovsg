import axios from 'axios'
import { Campaign, CampaignStats, ChannelType, Status, SMSCampaign, EmailCampaign } from 'classes'

// for dev use
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getStatus(jobs: Array<{status: string}>): string {
  let result
  const jobSet = new Set(jobs.map((x => x.status)))
  if(jobSet.has('READY') || jobSet.has('ENQUEUED') || jobSet.has('SENDING')){
    result = Status.Sending
  }
  else if(jobSet.has('SENT') || jobSet.has('LOGGED')){
    result = Status.Sent
  }
  else{
    result = Status.Draft
  }
  return result
}

function getSentAt(jobs: Array<{sent_at: Date}>): Date {
  const jobsSentAt = jobs.map((x => x.sent_at)).sort()
  // returns job with the earliest sentAt time
  return jobsSentAt[0]
}

export async function getCampaigns(): Promise<Array<Campaign>> {
  return axios.get('/campaigns').then((response) => {
    const campaigns: Campaign[] = response.data.map((data: any) => {

      const details = {
        ...data,
        sent_at: getSentAt(data.job_queue)
      }
    
      return new Campaign(details)
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
    const { campaign, num_recipients } = response.data
    const details = {
      ...campaign,
      num_recipients,
      sent_at:  getSentAt(campaign.job_queue),
    }

    switch(campaign.type){
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

export async function getPreviewMessage(campaignId: number): Promise<{body: string, subject?:string} | void> {
  return axios.get(`/campaign/${campaignId}/preview`).then((response)=>{
    return response.data?.preview
  })
}
