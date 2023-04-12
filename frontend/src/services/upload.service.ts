import axios, { AxiosError } from 'axios'

// require buffer with trailing slash to ensure use of the npm module named buffer
// instead of the node.js core module named buffer
import { Buffer } from 'buffer/'

import Papa from 'papaparse'
import SparkMD5 from 'spark-md5'

import type { EmailPreview, SMSPreview } from 'classes'

const MD5_CHUNK_SIZE = 5000000 // 5MB

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

async function getMd5(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const buffer = new SparkMD5.ArrayBuffer()
    const reader = new FileReader()

    const totalChunks = Math.ceil(blob.size / MD5_CHUNK_SIZE)
    let currentChunk = 0

    const loadChunk = () => {
      const start = currentChunk * MD5_CHUNK_SIZE
      const end =
        start + MD5_CHUNK_SIZE >= blob.size ? blob.size : start + MD5_CHUNK_SIZE
      reader.readAsArrayBuffer(blob.slice(start, end))
    }

    reader.onerror = () => reject(reader.error)

    reader.onload = (event) => {
      const data = event.target?.result
      if (data) {
        buffer.append(data as ArrayBuffer)
        currentChunk++

        if (currentChunk < totalChunks) {
          return loadChunk()
        }

        const md5 = Buffer.from(buffer.end(), 'hex').toString('base64')
        resolve(md5)
      }
    }

    loadChunk()
  })
}

export async function uploadFileWithPresignedUrl(
  uploadedFile: File,
  presignedUrl: string
): Promise<string> {
  try {
    const md5 = await getMd5(uploadedFile)
    const response = await axios.put(presignedUrl, uploadedFile, {
      headers: {
        'Content-Type': uploadedFile.type,
        'Content-MD5': md5,
      },
      withCredentials: false,
      timeout: 0,
    })
    return response.headers.etag
  } catch (e) {
    errorHandler(
      e,
      'Please try again. Error uploading file. Please contact the Postman team if this problem persists.'
    )
  }
}

export async function getPresignedUrl({
  campaignId,
  uploadedFile,
}: {
  campaignId: number
  uploadedFile: File
}): Promise<PresignedUrlResponse> {
  try {
    const mimeType = await getMimeType(uploadedFile)
    const md5 = await getMd5(uploadedFile)
    const response = await axios.get(`/campaign/${campaignId}/upload/start`, {
      params: {
        mime_type: mimeType,
        md5,
      },
    })
    const { transaction_id: transactionId, presigned_url: presignedUrl } =
      response.data
    return { transactionId, presignedUrl } as PresignedUrlResponse
  } catch (e) {
    errorHandler(e, 'Error completing file upload')
  }
}

export async function completeFileUpload({
  campaignId,
  transactionId,
  filename,
  etag,
}: {
  campaignId: number
  transactionId: string
  filename: string
  etag: string
}): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/upload/complete`, {
      transaction_id: transactionId,
      filename,
      etag,
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
    const response = await axios.get(`/campaign/${campaignId}/upload/status`)
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
      result.preview = preview
    }
    return result
  } catch (e) {
    errorHandler(e, 'Error getting csv status')
  }
}

/*
 * Checks uploaded file has mime type csv
 */
export async function getMimeType(uploadedFile: File): Promise<string> {
  let mimeType = uploadedFile.type
  if (mimeType === '') {
    const isValidCsv = await new Promise((resolve) => {
      Papa.parse(uploadedFile, {
        header: true,
        delimiter: ',',
        step: function (_, parser: Papa.Parser) {
          // Checks first row only
          parser.pause()
          parser.abort()
        },
        complete: function (results) {
          // results.data will contain 1 row of results because we aborted on the first step
          const { delimiter, fields } = results.meta
          resolve(
            delimiter === ',' &&
              // papaparse parses everything, including images, pdfs... This checks that at least one of the columns is sane
              fields?.some((field) => /^[a-zA-Z0-9\s-_'"/]+$/.test(field))
          )
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
  return mimeType
}

/*
 * Wrapper around multiple api calls to upload to s3
 */
export async function uploadFileToS3(
  campaignId: number,
  file: File
): Promise<string> {
  const startUploadResponse = await getPresignedUrl({
    campaignId: campaignId,
    uploadedFile: file,
  })
  // Upload to presigned url
  const etag = await uploadFileWithPresignedUrl(
    file,
    startUploadResponse.presignedUrl
  )
  await completeFileUpload({
    campaignId: +campaignId,
    transactionId: startUploadResponse.transactionId,
    filename: file.name,
    etag,
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

/*
 * Start multi part upload.
 * Returns the uploadId and s3Key, which is crucial for retrieving presigned url
 */
export async function beginMultipartUpload({
  campaignId,
  mimeType,
  partCount,
}: {
  campaignId: number
  mimeType: string
  partCount: number
}): Promise<{ transactionId: string; presignedUrls: string[] }> {
  try {
    const response = await axios.get(
      `/campaign/${campaignId}/protect/upload/start`,
      {
        params: {
          mime_type: mimeType,
          part_count: partCount,
        },
      }
    )
    const { transaction_id: transactionId, presigned_urls: presignedUrls } =
      response.data
    return { transactionId, presignedUrls }
  } catch (e) {
    errorHandler(e, 'Failed to begin multipart upload.')
  }
}

/*
 * Upload an array buffer to the presigned url.
 * Returns an etag that is essential to complete a multipart upload.
 */
export async function uploadPartWithPresignedUrl({
  presignedUrl,
  data,
}: {
  presignedUrl: string
  data: string[]
}): Promise<string> {
  try {
    const contentType = 'text/csv'
    const blob = new Blob(data, { type: contentType })

    const response = await axios.put(presignedUrl, blob, {
      withCredentials: false,
      timeout: 0,
    })
    return response.headers.etag
  } catch (e) {
    errorHandler(e, 'Error uploading part with presigned url')
  }
}

export async function completeMultiPartUpload({
  campaignId,
  filename,
  transactionId,
  partCount,
  etags,
}: {
  campaignId: number
  filename: string
  transactionId: string
  partCount: number
  etags: Array<string>
}): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/protect/upload/complete`, {
      filename,
      transaction_id: transactionId,
      part_count: partCount,
      etags: etags,
    })
  } catch (e) {
    errorHandler(e, 'Error completing multipart upload')
  }
}

function errorHandler(e: unknown, defaultMsg?: string): never {
  console.error(e)
  if (
    axios.isAxiosError(e) &&
    e.response &&
    e.response.data &&
    e.response.data.message
  ) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg || (e as AxiosError).response?.statusText)
}
