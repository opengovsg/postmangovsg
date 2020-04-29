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

export async function saveTemplate(campaignId: number, body: string):
  Promise<{ numRecipients: number; updatedTemplate?: { body: string; params: Array<string> } }> {
  try {
    const response = await axios.put(`/campaign/${campaignId}/sms/template`, {
      body,
    })
    const { num_recipients: numRecipients, message, updatedTemplate } = response.data
    // How should we show this message?
    console.log(message)
    return { numRecipients, updatedTemplate }
  } catch (e) {
    errorHandler(e, 'Error saving template.')
  }
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
}): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/sms/credentials`, {
      twilioAccountSid: accountSid,
      twilioApiKey: apiKey,
      twilioApiSecret: apiSecret,
      twilioMessagingServiceSid: messagingServiceSid,
      recipient,
    })
  } catch (e) {
    errorHandler(e, 'Error validating credentials.')
  }
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
  filename,
}: {
  campaignId: number;
  transactionId: string;
  filename: string;
}): Promise<UploadCompleteResponse> {
  try {
    const response = await axios.post(`/campaign/${campaignId}/sms/upload/complete`, {
      transactionId,
      filename,
    })
    return response.data
  } catch (e) {
    errorHandler(e, 'Error completing file upload')
  }
}

export async function getPreviewMessage(campaignId: number): Promise<{ body: string }> {
  try {
    const response = await axios.get(`/campaign/${campaignId}/sms/preview`)
    return response.data?.preview
  } catch (e) {
    errorHandler(e, 'Unable to get preview message')
  }
}

function errorHandler(e: AxiosError, defaultMsg: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg)
}