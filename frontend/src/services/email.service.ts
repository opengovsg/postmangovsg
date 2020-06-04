import axios, { AxiosError } from 'axios'

interface PresignedUrlResponse {
  presignedUrl: string
  transactionId: string
}

interface CsvStatusResponse {
  isCsvProcessing: boolean
  csvFilename?: string
  tempCsvFilename?: string
  csvError?: string
  numRecipients?: number
  preview?: PreviewMessage
}

interface PreviewMessage {
  body: string
  subject: string
  replyTo: string | null
}

export async function saveTemplate(
  campaignId: number,
  subject: string,
  body: string,
  replyTo: string | null
): Promise<{
  numRecipients: number
  updatedTemplate?: {
    body: string
    subject: string
    reply_to: string | null
    params: Array<string>
  }
}> {
  try {
    const response = await axios.put(`/campaign/${campaignId}/email/template`, {
      body,
      subject,
      // Replace unwanted values (undefined and empty string) with null. Cases where this happens:
      // 1. User saves the template with no replyTo email - undefined
      // 2. User deletes the replyTo email after previously setting it - empty string
      reply_to: replyTo || null,
    })
    const {
      num_recipients: numRecipients,
      template: updatedTemplate,
    } = response.data
    return { numRecipients, updatedTemplate }
  } catch (e) {
    errorHandler(e, 'Error saving template')
  }
}

export async function sendPreviewMessage({
  campaignId,
  recipient,
}: {
  campaignId: number
  recipient: string
}): Promise<void> {
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
  campaignId: number
  mimeType: string
}): Promise<PresignedUrlResponse> {
  try {
    const response = await axios.get(
      `/campaign/${campaignId}/email/upload/start`,
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
}): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/email/upload/complete`, {
      transaction_id: transactionId,
      filename,
    })
    return
  } catch (e) {
    errorHandler(e, 'Error completing file upload')
  }
}

export async function getCsvStatus(
  campaignId: number
): Promise<CsvStatusResponse> {
  try {
    const response = await axios.get(
      `/campaign/${campaignId}/email/upload/status`
    )
    const {
      is_csv_processing: isCsvProcessing,
      csv_filename: csvFilename,
      temp_csv_filename: tempCsvFilename,
      csv_error: csvError,
      num_recipients: numRecipients,
      preview,
    } = response.data
    const result = {
      isCsvProcessing,
      csvFilename,
      tempCsvFilename,
      csvError,
      numRecipients,
    } as CsvStatusResponse
    if (preview) {
      const { subject, body, reply_to: replyTo } = preview
      result.preview = { subject, body, replyTo }
    }
    return result
  } catch (e) {
    errorHandler(e, 'Error getting csv status')
  }
}

export async function getPreviewMessage(
  campaignId: number
): Promise<PreviewMessage> {
  try {
    const response = await axios.get(`/campaign/${campaignId}/email/preview`)
    const { body, subject, reply_to: replyTo } = response.data?.preview
    return { body, subject, replyTo }
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
