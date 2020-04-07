import axios from 'axios'
import { Campaign, ChannelType } from 'models/Campaign'

// for dev use
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function getCampaigns(): Promise<Array<Campaign>> {
  const campaigns: Array<Campaign> = [
    {
      type: ChannelType.SMS,
      name: 'test sms',
      valid: true,
      timeSent: 'today',
      msgsSent: 123,
      status: 'In progress',
    },
    {
      type: ChannelType.EMAIL,
      name: 'test email',
      valid: true,
      timeSent: 'today',
      msgsSent: 456,
      status: 'Completed',
    },
  ]

  await sleep(1000)
  return Promise.resolve(campaigns)
}

export {
  getCampaigns,
}