import axios, { AxiosError } from 'axios'
import Papa from 'papaparse'
import { EmailPreview, SMSPreview } from 'classes'
import { getTemplateBody } from './email.service'
import { encryptData, hashData } from './crypto.service'

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
  uploadedFile,
}: {
  campaignId: number
  uploadedFile: File
}): Promise<PresignedUrlResponse> {
  try {
    const mimeType = await getMimeType(uploadedFile)
    const response = await axios.get(`/campaign/${campaignId}/upload/start`, {
      params: {
        mime_type: mimeType,
      },
    })
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
    await axios.post(`/campaign/${campaignId}/upload/complete`, {
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
      const { subject, body, reply_to: replyTo } = preview
      result.preview = { subject, body, replyTo }
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
              fields.some((field) => /^[a-zA-Z0-9\s-_'"/]+$/.test(field))
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

//SWTODO: Move this interface somewhere else
interface ProtectedParams {
  recipient: string
  password: string
}

/*
 * SWTODO: Swap template body for content template once the new component is out
 * 1. Gets template body from backend.
 * 2. Initiate multipart upload
 * 3. Parse the csv file in chunks of 10mb
 * 4. For each chunk:
 *    - Loop through each params in the chunk, and transform the data into the following format:
 *    - `recipient,encryptedPayload,passwordHash`
 *    - Join all the data into a single string
 *    - Get a presigned url from backend and upload to s3 with the presigned url.
 * 5. Note, for the first chunk, we need to add in the headers.
 * 6. Once the file is done parsing, we complete the multipart upload.
 */
export async function multipartUploadToS3(
  campaignId: number,
  file: File
): Promise<void> {
  const templateBody = await getTemplateBody(campaignId)
  if (templateBody === undefined)
    throw new Error('There is no template body for the campaign.')

  const mimeType = await getMimeType(file)

  const { uploadId, s3Key } = await beginMultipartUpload({
    campaignId,
    mimeType,
  })

  let partNumber = 0

  const etags: Array<string> = []

  // Parse file
  await new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      delimiter: ',',
      chunk: async function (chunk, parser) {
        parser.pause()
        partNumber++
        const paramsArr = chunk.data as Array<ProtectedParams>

        // transform into rows of data in this format:
        // recipient,encryptedPayload,passwordHash
        const rows = await Promise.all(
          paramsArr.map(async (params) => {
            return await transformRow(templateBody, params)
          })
        )

        // Join the rows into a single string
        const data = processChunkdata(rows, partNumber)

        const presignedUrl = await getPresignedMultipartUrl({
          campaignId,
          s3Key,
          uploadId,
          partNumber,
        })

        // Upload the single string onto s3 based through the presigned url
        const etag = await uploadPartWithPresignedUrl({
          presignedUrl,
          contentType: mimeType,
          data,
        })

        etags.push(etag)

        parser.resume()
      },
      complete: async function () {
        await completeMultiPartUpload({
          campaignId,
          s3Key,
          uploadId,
          partCount: partNumber,
          etags,
        })
        resolve()
      },
    })
  })
}

/*
 * 1. Hydrates the template with the params.
 * 2. Encrypt the hydrated message with the password that is from the params.
 * 3. Hash the password
 * 4. Return in the format of `recipient,encryptedPayload,passwordHash`
 */
async function transformRow(
  template: string,
  params: ProtectedParams
): Promise<string> {
  const recipient = params.recipient
  const password = params.password
  // SWTODO: import templating module and hydrate
  const hydratedMessage = template
  const encryptedPayload = await encryptData(hydratedMessage, password)
  const passwordHash = await hashData(password)
  return `"${recipient}","${encryptedPayload}","${passwordHash}"`
}

/*
 * Start multi part upload.
 * Returns the uploadId and s3Key, which is crucial for retrieving presigned url
 */
async function beginMultipartUpload({
  campaignId,
  mimeType,
}: {
  campaignId: number
  mimeType: string
}): Promise<{ uploadId: string; s3Key: string }> {
  const response = await axios.get(
    `/campaign/${campaignId}/upload-start-multipart`,
    {
      params: {
        mime_type: mimeType,
      },
    }
  )
  const { upload_id: uploadId, s3_key: s3Key } = response.data
  return {
    uploadId,
    s3Key,
  }
}

/*
 * Gets a presigned url from backend for s3 multipart upload.
 * The part number is important. If it is repeated, it will override the previous uploads.
 */
async function getPresignedMultipartUrl({
  campaignId,
  s3Key,
  uploadId,
  partNumber,
}: {
  campaignId: number
  s3Key: string
  uploadId: string
  partNumber: number
}): Promise<string> {
  const response = await axios.get(
    `/campaign/${campaignId}/upload-multipart-url`,
    {
      params: {
        s3_key: s3Key,
        upload_id: uploadId,
        part_number: partNumber,
      },
    }
  )
  const { presigned_url: presignedUrl } = response.data
  return presignedUrl
}

/*
 * Upload a string to the presigned url.
 * Returns an etag that is essential to complete a multipart upload.
 */
async function uploadPartWithPresignedUrl({
  presignedUrl,
  contentType,
  data,
}: {
  presignedUrl: string
  contentType: string
  data: string
}): Promise<string> {
  const response = await axios.put(presignedUrl, data, {
    headers: {
      'Content-Type': contentType,
      withCredentials: false,
      timeout: 0,
    },
  })
  return response.headers.etag
}

async function completeMultiPartUpload({
  campaignId,
  s3Key,
  uploadId,
  partCount,
  etags,
}: {
  campaignId: number
  s3Key: string
  uploadId: string
  partCount: number
  etags: Array<string>
}): Promise<void> {
  try {
    await axios.post(`/campaign/${campaignId}/upload-complete-multipart`, {
      s3_key: s3Key,
      upload_id: uploadId,
      part_count: partCount,
      etags: etags,
    })
  } catch (e) {
    errorHandler(e, 'Error completing multipart upload')
  }
}

// Combine the rows into a single string
// If part number is 1, we need to add in the headers
function processChunkdata(rows: Array<string>, partNumber: number) {
  // Join the rows into a single string
  if (partNumber === 1) {
    const headers = 'recipient,encrypted_payload,password_hash\n'
    return headers + rows.join('\n')
  } else {
    return rows.join('\n')
  }
}

function errorHandler(e: AxiosError, defaultMsg?: string): never {
  console.error(e)
  if (e.response && e.response.data && e.response.data.message) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg || e.response?.statusText)
}
