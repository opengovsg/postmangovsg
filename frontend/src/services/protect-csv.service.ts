import Papa from 'papaparse'

import { encryptData, hashData, genSalt } from './crypto.service'
import { getPreviewOfFirstRow } from './validate-csv.service'
import {
  beginMultipartUpload,
  uploadPartWithPresignedUrl,
  completeMultiPartUpload,
} from './upload.service'

import { TemplateClient } from 'postman-templating'

// TODO: Move xss option elsewhere
const templateClient = new TemplateClient({
  whiteList: {
    b: [],
    i: [],
    u: [],
    br: [],
    p: [],
    a: ['href', 'title', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  stripIgnoreTag: true,
})

const DEFAULT_CHUNK_SIZE = 10000000 // 10 Mb
const MIN_UPLOAD_SIZE = 5000000 // 5Mb minimum needed for uploading each part

/*
 * 1. Hydrates the template with the params.
 * 2. Encrypt the hydrated message with the password that is from the params.
 * 3. Hash the password
 * 4. Return in the format of `recipient,encryptedPayload,passwordHash`
 */
async function transformRows(
  template: string,
  rows: any[],
  partNumber: number
): Promise<string[]> {
  const transformed = await Promise.all(
    rows.map(async (row) => {
      const { recipient, password } = row
      const hydratedMessage = templateClient.template(template, row)
      const salt = await genSalt()
      const encryptedPayload = await encryptData(
        hydratedMessage,
        password,
        salt
      )
      const passwordHash = await hashData(password, salt)
      return `${recipient},"${encryptedPayload}",${passwordHash}\n`
    })
  )
  return partNumber === 1
    ? ['recipient,payload,passwordhash\n'].concat(transformed)
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
        const templatedSize = getPreviewOfFirstRow(template, row).length
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

/*
 * 1. Initiate multipart upload
 * 2. Parse the csv file in chunks of 10mb
 * 3. For each chunk:
 *    - Loop through each params in the chunk, and transform the data into the following format:
 *    - `recipient,encryptedPayload,passwordHash`
 *    - Join all the data into a single string
 *    - Get a presigned url from backend and upload to s3 with the presigned url.
 * 4. Note, for the first chunk, we need to add in the headers.
 * 5. Once the file is done parsing, we complete the multipart upload.
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
  // Start parsing by chunks

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

        // transform into rows of data into {recipient,payload,passwordHash}
        //  and join the rows into a single string
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
