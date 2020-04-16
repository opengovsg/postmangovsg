import axios from 'axios'

export async function saveTemplate(campaignId: number, body: string): Promise<boolean> {
  return Promise.resolve(true)
}

export async function validateCredentials(
  accountSid: string,
  apiKey: string,
  apiSecret: string,
  messagingServiceSid: string,
  mobile: string
): Promise<boolean> {
  return Promise.resolve(true)
}