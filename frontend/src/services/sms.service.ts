import axios, { AxiosError } from 'axios'

interface PresignedUrlResponse {
  presignedUrl: string
  transactionId: string
}

interface UploadCompleteResponse {
  template_body: string
  num_recipients: number
  hydrated_record: string
}

export async function saveTemplate(
  campaignId: number,
  body: string
): Promise<{
  numRecipients: number
  updatedTemplate?: { body: string; params: Array<string> }
}> {
  try {
    const response = await axios.put(`/campaign/${campaignId}/sms/template`, {
      body,
    })
    const {
      num_recipients: numRecipients,
      template: updatedTemplate,
    } = response.data
    return { numRecipients, updatedTemplate }
  } catch (e) {
    errorHandler(e, 'Error saving template.')
  }
}

export async function validateNewCredentials({
  campaignId,
  accountSid,
  apiKey,
  apiSecret,
  messagingServiceSid,
  recipient,
}: {
  campaignId: number
  recipient: string
  accountSid: string
  apiKey: string
  apiSecret: string
  messagingServiceSid: string
}): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/sms/new-credentials`, {
      recipient,
      twilio_account_sid: accountSid,
      twilio_api_key: apiKey,
      twilio_api_secret: apiSecret,
      twilio_messaging_service_sid: messagingServiceSid,
    })
  } catch (e) {
    errorHandler(e, 'Error validating credentials.')
  }
}

export async function validateStoredCredentials({
  campaignId,
  recipient,
  label,
}: {
  campaignId: number
  recipient: string
  label: string
}): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/sms/credentials`, {
      recipient,
      label,
    })
  } catch (e) {
    errorHandler(e, 'Error validating credentials.')
  }
}

export async function storeCredentials({
  label,
  accountSid,
  apiKey,
  apiSecret,
  messagingServiceSid,
  recipient,
}: {
  label: string
  accountSid: string
  apiKey: string
  apiSecret: string
  messagingServiceSid: string
  recipient: string
}): Promise<void> {
  try {
    await axios.post('/settings/sms/credentials', {
      label,
      twilio_account_sid: accountSid,
      twilio_api_key: apiKey,
      twilio_api_secret: apiSecret,
      twilio_messaging_service_sid: messagingServiceSid,
      recipient,
    })
  } catch (e) {
    errorHandler(e, 'Error saving credentials.')
  }
}

export async function getStoredCredentials(): Promise<string[]> {
  try {
    const response = await axios.get('/settings/sms/credentials')
    return response.data
  } catch (e) {
    errorHandler(e, 'Error retrieving stored credentials')
  }
}

export async function getPresignedUrl({
  campaignId,
  mimeType,
}: {
  campaignId: number
  mimeType: string
}): Promise<PresignedUrlResponse> {
  try {
    const response = await axios.get(
      `/campaign/${campaignId}/sms/upload/start`,
      {
        params: {
          mime_type: mimeType,
        },
      }
    )
    const {
      transaction_id: transactionId,
      presigned_url: presignedUrl,
    } = response.data
    return { transactionId, presignedUrl } as PresignedUrlResponse
  } catch (e) {
    errorHandler(e, 'Error completing file upload')
  }
}

export async function completeFileUpload({
  campaignId,
  transactionId,
  filename,
}: {
  campaignId: number
  transactionId: string
  filename: string
}): Promise<UploadCompleteResponse> {
  try {
    const response = await axios.post(
      `/campaign/${campaignId}/sms/upload/complete`,
      {
        transaction_id: transactionId,
        filename,
      }
    )
    return response.data
  } catch (e) {
    errorHandler(e, 'Error completing file upload')
  }
}

export async function getPreviewMessage(
  campaignId: number
): Promise<{ body: string }> {
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
