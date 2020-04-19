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
    const jobSet = new Set(jobs.map(({ status }: {status: string}) => status))
    let status = Status.Draft
    if(jobSet.has('READY') || jobSet.has('ENQUEUED') || jobSet.has('SENDING')){
      status = Status.Sending
    }
    else if(jobSet.has('SENT') || jobSet.has('LOGGED')){
      status = Status.Sent
    }

    const details = {
      id,
      type,
      name,
      hasCredential,
      createdAt,
      status,
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