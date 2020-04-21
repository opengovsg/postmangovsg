import axios from 'axios'

interface PresignedUrlResponse {
  presignedUrl: string;
  transactionId: string;
}

interface UploadCompleteResponse {
  template_body: string;
  num_recipients: number;
  hydrated_record: string;
}

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

export async function getPresignedUrl({
  campaignId,
  mimeType,
}: {
  campaignId: number
  mimeType: string
}): Promise<PresignedUrlResponse> {
  return axios
    .get(`/campaign/${campaignId}/sms/upload/start`, {
      params: {
        mimeType,
      },
    })
    .then((resp) => resp.data)
}

export async function completeFileUpload({
  campaignId,
  transactionId,
}: {
  campaignId: number
  transactionId: string
}): Promise<UploadCompleteResponse> {
  return axios
    .post(`/campaign/${campaignId}/sms/upload/complete`, {
      transactionId,
    })
    .then((resp) => resp.data)
}
