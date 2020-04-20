import axios from 'axios'

export async function saveTemplate(campaignId: number, body: string): Promise<boolean> {
  return axios.put(`/campaign/${campaignId}/template`,{
    body,
  }).then((response) => {
    return response.status === 200
  })
}

export async function validateCredentials({
  campaignId, accountSid, apiKey, apiSecret, messagingServiceSid, recipient,
}: {
  campaignId: number;
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  messagingServiceSid: string;
  recipient: string;
}): Promise<boolean> {
  return axios.post(`/campaign/${campaignId}/credentials`,{
    twilioAccountSid: accountSid,
    twilioApiKey: apiKey,
    twilioApiSecret: apiSecret,
    twilioMessagingServiceSid: messagingServiceSid,
    recipient,
  }).then((response) => {
    return response.status === 200
  })
}