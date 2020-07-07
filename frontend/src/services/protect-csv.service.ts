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
): Promise<string> {
  const transformed = []
  if (partNumber === 1) {
    transformed.push('recipient,payload,passwordhash')
  }
  for (const row of rows) {
    console.time('row')
    const { recipient, password } = row
    const hydratedMessage = template
    const encryptedPayload = await encryptData(hydratedMessage, password)
    console.timeLog('row')
    const passwordHash = password
    transformed.push(`${recipient},"${encryptedPayload}",${passwordHash}`)
    console.timeEnd('row')
  }
  return transformed.join('\n')
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
  Papa.LocalChunkSize = '100000'

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter: ',',
      skipEmptyLines: true,
      // worker: true,
      chunk: async function (chunk, parser) {
        parser.pause()
        console.log(chunk.meta)
        console.time('chunk')
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

        // Upload the single string onto s3 based through the presigned url
        const etag = await uploadPartWithPresignedUrl({
          presignedUrl,
          contentType: 'text/csv',
          data,
        })
        etags.push(etag)
        console.timeEnd('chunk')
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
