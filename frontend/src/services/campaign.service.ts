import axios from 'axios'

// for dev use
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function getCampaigns(): Promise<any> {
  const campaigns = [
    {
      Mode: 'sms',
      Name: 'test sms',
      'Time Sent': 'today',
      'Messages Sent': 123,
      Status: 'In progress'
    },
    {
      Mode: 'email',
      Name: 'test email',
      'Time Sent': 'today',
      'Messages Sent': 456,
      Status: 'Completed'
    }
  ]

  await sleep(1000)
  return Promise.resolve(campaigns)
}

export {
  getCampaigns,
}