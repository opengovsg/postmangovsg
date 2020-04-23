import axios, { AxiosError } from 'axios'

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
  return axios.put(`/campaign/${campaignId}/sms/template`, {
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
  return axios.post(`/campaign/${campaignId}/sms/credentials`, {
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
  campaignId: number;
  mimeType: string;
}): Promise<PresignedUrlResponse> {
  try {
    const response = await axios.get(`/campaign/${campaignId}/sms/upload/start`, {
      params: {
        mimeType,
      },
    })
    return response.data
  } catch (e) {
    errorHandler(e, 'Error completing file upload')
  }
}

export async function completeFileUpload({
  campaignId,
  transactionId,
}: {
  campaignId: number;
  transactionId: string;
}): Promise<UploadCompleteResponse> {
  try {
    const response = await axios.post(`/campaign/${campaignId}/sms/upload/complete`, {
      transactionId,
    })
    return response.data
  } catch (e) {
    errorHandler(e, 'Error completing file upload')
  }
}

function errorHandler(e: AxiosError, defaultMsg: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg)
}