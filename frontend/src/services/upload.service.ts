import axios, { AxiosError } from 'axios'
import { EmailPreview, SMSPreview } from 'classes'

interface PresignedUrlResponse {
  presignedUrl: string
  transactionId: string
}

export interface CsvStatusResponse {
  isCsvProcessing: boolean
  csvFilename?: string
  tempCsvFilename?: string
  csvError?: string
  numRecipients?: number
  preview?: EmailPreview | SMSPreview
}

export async function uploadFileWithPresignedUrl(
  uploadedFile: File,
  presignedUrl: string
): Promise<void> {
  try {
    await axios.put(presignedUrl, uploadedFile, {
      headers: { 'Content-Type': uploadedFile.type },
      withCredentials: false,
      timeout: 0,
    })
    return
  } catch (e) {
    errorHandler(e)
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

/*
 * Wrapper around multiple api calls to upload to s3
 */
export async function uploadFileToS3(
  campaignId: number,
  file: File
): Promise<string> {
  throw new Error('error')
  const startUploadResponse = await getPresignedUrl({
    campaignId: campaignId,
    mimeType: file.type,
  })
  // Upload to presigned url
  await uploadFileWithPresignedUrl(file, startUploadResponse.presignedUrl)
  await completeFileUpload({
    campaignId: +campaignId,
    transactionId: startUploadResponse.transactionId,
    filename: file.name,
  })
  return file.name
}

export async function deleteCsvStatus(campaignId: number): Promise<void> {
  try {
    await axios.delete(`/campaign/${campaignId}/upload/status`)
  } catch (e) {
    // No need to throw an error
    console.error('Error deleting csv error status', e)
  }
}

function errorHandler(e: AxiosError, defaultMsg?: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg || e.response?.statusText)
}
