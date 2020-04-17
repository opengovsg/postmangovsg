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

export async function getCampaigns(): Promise<Array<Campaign>> {
  return axios.get('/campaigns').then((response) => {
    const campaigns: Campaign[] = response.data.map((data: any) => {
      const { id,
        type,
        name,
        has_credential: hasCredential,
        created_at: createdAt,
        job_queue : jobs,
      } = data
      const details =
      {
        id,
        type,
        name,
        hasCredential,
        createdAt,
        status: getStatus(jobs),
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

export async function getCampaignDetails(campaignId: number): Promise<Campaign | SMSCampaign> {
  return axios.get(`/campaign/${campaignId}`).then((response) => {
    const { campaign, num_recipients : numRecipients } = response.data
    const { id,
      type,
      name,
      has_credential: hasCredential,
      created_at: createdAt,
      job_queue : jobs,
      email_templates: emailTemplate,
      sms_templates: smsTemplate } = campaign


    const details = {
      id,
      type,
      name,
      hasCredential,
      createdAt,
      status: getStatus(jobs),
      numRecipients,
      ...emailTemplate,
      ...smsTemplate,
    }
    return type === ChannelType.SMS ? new SMSCampaign(details) : new Campaign(details)
  })
}

export async function createCampaign(name: string, type: ChannelType): Promise<Campaign> {
  return axios.post('/campaigns', { name, type }).then(
    (response) => {
      return new Campaign(response.data)
    })
}

export async function sendCampaign(campaignId: number): Promise<boolean>{
  return axios.post(`/campaign/${campaignId}/send`).then((response) => response.status===200)
}

export async function stopCampaign(campaignId: number): Promise<boolean>{
  return axios.post(`/campaign/${campaignId}/stop`).then((response) => response.status===200)
}

export async function retryCampaign(campaignId: number): Promise<boolean>{
  return axios.post(`/campaign/${campaignId}/retry`).then((response) => response.status===200)
}