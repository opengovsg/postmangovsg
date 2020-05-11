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

export async function saveTemplate(campaignId: number, subject: string, body: string):
  Promise<{ numRecipients: number; updatedTemplate?: { body: string; subject: string; params: Array<string> } }> {
  try {
    const response = await axios.put(`/campaign/${campaignId}/email/template`, {
      body,
      subject,
    })
    const { num_recipients: numRecipients, template: updatedTemplate } = response.data
    return { numRecipients, updatedTemplate }
  } catch (e) {
    errorHandler(e, 'Error saving template')
  }
}

export async function sendPreviewMessage({ campaignId, recipient }: { campaignId: number; recipient: string }): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/email/credentials`, {
      recipient,
    })
  } catch (e) {
    errorHandler(e, 'Send preview message failed')
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
    const response = await axios.get(`/campaign/${campaignId}/email/upload/start`, {
      params: {
        'mime_type': mimeType,
      },
    })
    const { 'transaction_id': transactionId, 'presigned_url': presignedUrl } = response.data
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
  campaignId: number;
  transactionId: string;
  filename: string;
}): Promise<UploadCompleteResponse> {
  try {
    const response = await axios.post(`/campaign/${campaignId}/email/upload/complete`, {
      'transaction_id': transactionId,
      filename,
    })
    return response.data
  } catch (e) {
    errorHandler(e, 'Error completing file upload')
  }
}

export async function getPreviewMessage(campaignId: number): Promise<{ body: string; subject: string }> {
  try {
    const response = await axios.get(`/campaign/${campaignId}/email/preview`)
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
  throw new Error(defaultMsg || e.response?.statusText)
}
