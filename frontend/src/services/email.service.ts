import axios, { AxiosError } from 'axios'
import Papa from 'papaparse'
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
  uploadedFile,
}: {
  campaignId: number
  uploadedFile: File
}): Promise<PresignedUrlResponse> {
  let mimeType = uploadedFile.type
  if (mimeType === '') {
    const isValidCsv = await new Promise((resolve) => {
      Papa.parse(uploadedFile, {
        header: true,
        delimiter: ',',
        step: function (results, parser: Papa.Parser) {
          // Checks first row only
          parser.pause()
          parser.abort()
        },
        complete: function (results) {
          // results.data will contain 1 row of results because we aborted on the first step
          resolve(results.meta.delimiter === ',')
        },
        error: function () {
          resolve(false)
        },
      })
    })
    if (isValidCsv) {
      mimeType = 'text/csv'
    } else {
      throw new Error(
        'Please make sure you are uploading a file in CSV format.'
      )
    }
  }

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
}): Promise<UploadCompleteResponse> {
  try {
    const response = await axios.post(
      `/campaign/${campaignId}/email/upload/complete`,
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
): Promise<{ body: string; subject: string; reply_to: string | null }> {
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
