import { SmsTemplate } from '@sms/models'

const upsertTemplate = (body: string, campaignId: number) => {
  return SmsTemplate.upsert({
    campaignId, body
  })
}

export { upsertTemplate }