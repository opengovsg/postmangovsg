import Papa from 'papaparse'

import { encryptData, hashData } from './crypto.service'
import {
  beginMultipartUpload,
  getPresignedMultipartUrl,
  uploadPartWithPresignedUrl,
  completeMultiPartUpload,
} from './upload.service'

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
  const t0 = performance.now()
  const transformed = await Promise.allSettled(
    rows.map(async (row) => {
      const { recipient, password } = row
      const hydratedMessage = template
      const encryptedPayload = await encryptData(hydratedMessage, password)
      const passwordHash = password
      return `${recipient},"${encryptedPayload}",${passwordHash}\n`
    })
  )
    .then((results) =>
      results.filter((result) => result.status === 'fulfilled')
    )
    .then((results) =>
      results.map((result) => (result as PromiseFulfilledResult<string>).value)
    )

  const t1 = performance.now()
  console.log(
    JSON.stringify({
      numRows: rows.length,
      totalMsEncrypt: t1 - t0,
      averageMsPerRow: (t1 - t0) / rows.length,
    })
  )
  return partNumber === 1
    ? ['recipient,payload,passwordhash\n'].concat(transformed)
    : transformed
}

async function chunkSize(file: File, template: string): Promise<number> {
  const defaultChunkSize = 10000000 // 10 Mb
  const minChunkSize = 5000000 // 5Mb minimum needed for uploading each part
  let numChars = template.length
  let rowChars = 0
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      delimiter: ',',
      step: function (_, parser: Papa.Parser) {
        // Checks first row only
        parser.pause()
        parser.abort()
      },
      complete: function (results) {
        // We can also check for recipient and password here.
        // results.data will contain 1 row of results because we aborted on the first step
        const row = Object.entries(results.data) as Array<[string, string]>
        for (const [field, value] of row) {
          if (/^[a-zA-Z0-9\s-_'"/]+$/.test(field)) {
            // field is of an acceptable format
            const regexp = new RegExp(`{{\\s*${field}\\s*}}`, 'gi')
            const numReplacements = template.match(regexp)?.length || 0
            numChars += value.length * numReplacements
            rowChars += value.length
          }
        }

        const templatedSize = numChars * 4 // 4 bytes per character
        const rowSize = rowChars * 4
        const size = Math.ceil((minChunkSize / templatedSize) * rowSize)
        console.log(
          JSON.stringify({ size, templatedSize, rowSize, minChunkSize })
        )
        resolve(size)
      },
      error: function () {
        resolve(defaultChunkSize)
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
  const transactionId = await beginMultipartUpload({
    campaignId,
    mimeType: 'text/csv', // no need to check mime type, since we're creating the csv
  })

  console.time('start')
  let partNumber = 0

  const etags: Array<string> = []
  // Start parsing by chunks
  const size = await chunkSize(file, template)
  Papa.LocalChunkSize = String(size)
  const partsNeeded = Math.ceil(file.size / size)
  console.log(
    JSON.stringify({ fileSize: file.size, chunkSize: size, partsNeeded })
  )
  Papa.LocalChunkSize = String(size)
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter: ',',
      skipEmptyLines: true,
      // worker: true,
      chunk: async function (chunk, parser) {
        parser.pause()
        console.log(chunk.meta)

        partNumber++
        console.log('part no.', partNumber)
        const rows = chunk.data

        // transform into rows of data into {recipient,payload,passwordHash}
        //  and join the rows into a single string
        const data = await transformRows(template, rows, partNumber)

        const presignedUrl = await getPresignedMultipartUrl({
          campaignId,
          transactionId,
          partNumber,
        })

        console.time('uploadPartWithPresignedUrl')
        // Upload the single string onto s3 based through the presigned url
        const etag = await uploadPartWithPresignedUrl({
          presignedUrl,
          data,
        })
        etags.push(etag)
        console.timeEnd('uploadPartWithPresignedUrl')
        parser.resume()
      },
      complete: async function () {
        console.log('complete')
        console.timeEnd('start')
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
