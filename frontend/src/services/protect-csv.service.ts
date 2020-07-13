import Papa from 'papaparse'
import { uuid } from 'uuidv4'

import { encryptData, sha256 } from './crypto.service'
import { hydrateTemplate } from './validate-csv.service'
import {
  beginMultipartUpload,
  uploadPartWithPresignedUrl,
  completeMultiPartUpload,
} from './upload.service'

const DEFAULT_CHUNK_SIZE = 10000000 // 10 Mb
const MIN_UPLOAD_SIZE = 5000000 // 5Mb minimum needed for uploading each part

/**
 * 1. Hydrates the template with the params.
 * 2. Generate uuid and use as salt
 * 3. Encrypt the hydrated message with the password that is from the params.
 * 4. Hash the derived key with SHA-256
 * 5. Return in the format of `recipient,encryptedPayload,passwordHash,id`
 */
async function transformRows(
  template: string,
  rows: any[],
  partNumber: number
): Promise<string[]> {
  const transformed = await Promise.all(
    rows.map(async (row) => {
      const { recipient, password } = row
      // Hydrate template
      const hydratedMessage = hydrateTemplate(template, row)
      // Generate uuid which acts as salt
      const id = uuid()
      const { encrypted: encryptedPayload, key } = await encryptData(
        hydratedMessage,
        password,
        id
      )
      const passwordHash = await sha256(key)
      return `${recipient},"${encryptedPayload}",${passwordHash},${id}\n`
    })
  )
  return partNumber === 1
    ? ['recipient,payload,passwordhash,id\n'].concat(transformed)
    : transformed
}

// Calculates approximate chunk size for multipart upload
async function chunkSize(file: File, template: string): Promise<number> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      delimiter: ',',
      step: function (_, parser) {
        // Checks first row only
        parser.pause()
        parser.abort()
      },
      complete: async function (results) {
        // results.data will contain 1 row of results because we aborted on the first step
        const row = results.data
        const templatedSize = hydrateTemplate(template, row).length
        const rowSize = Object.values(row).join(',').length
        const size = Math.ceil(
          (MIN_UPLOAD_SIZE / 4) * (rowSize / templatedSize) // convert bytes to chars
        )
        resolve(size)
      },
      error: function () {
        resolve(DEFAULT_CHUNK_SIZE)
      },
    })
  })
}

/**
 * 1. Calculate number of parts
 * 2. Initiate multipart upload
 * 3. Transform the csv file in chunks of the calculated size
 * 4. Complete the multipart upload.
 */
export async function protectAndUploadCsv(
  campaignId: number,
  file: File,
  template: string
): Promise<void> {
  const size = await chunkSize(file, template)
  const partCount = Math.ceil(file.size / size)
  const { transactionId, presignedUrls } = await beginMultipartUpload({
    campaignId,
    mimeType: 'text/csv', // no need to check mime type, since we're creating the csv
    partCount,
  })
  let partNumber = 0
  const etags: Array<string> = []
  Papa.LocalChunkSize = String(size)
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter: ',',
      skipEmptyLines: true,
      chunk: async function (chunk, parser) {
        parser.pause()
        partNumber++
        const rows = chunk.data

        // transform into rows of data into {recipient,payload,passwordHash,id}
        const data = await transformRows(template, rows, partNumber)

        // Upload the single string onto s3 based through the presigned url
        const etag = await uploadPartWithPresignedUrl({
          presignedUrl: presignedUrls[partNumber - 1],
          data,
        })
        etags.push(etag)
        parser.resume()
      },
      complete: async function () {
        await completeMultiPartUpload({
          campaignId,
          filename: file.name,
          transactionId,
          partCount: partNumber,
          etags,
        })
        resolve()
      },
      error: reject,
    })
  })
}
