import S3 from 'aws-sdk/clients/s3'
import CSVParse from 'csv-parse'
import { isEmpty } from 'lodash'

import config from '@core/config'
import logger from '@core/logger'
import { RecipientColumnMissing } from '@core/errors/s3.errors'
import { configureEndpoint } from '@core/utils/aws-endpoint'

type CSVParamsInterface = { [key: string]: string }
const FILE_STORAGE_BUCKET_NAME = config.get('aws.uploadBucket')

export default class S3Client {
  s3: S3
  constructor(s3?: S3) {
    this.s3 =
      s3 ||
      new S3({
        signatureVersion: 'v4',
        ...configureEndpoint(config),
      })
  }

  download(key: string): NodeJS.ReadableStream {
    const params: S3.GetObjectRequest = {
      Bucket: FILE_STORAGE_BUCKET_NAME,
      Key: key,
    }
    return this.s3.getObject(params).createReadStream()
  }

  /**
   * Ensures that the recipient column exists and converts headers to lowercase
   * Deduplicates the csv by overriding the same recipient with newer records
   * @param readStream
   */
  async parseCsv(
    readStream: NodeJS.ReadableStream
  ): Promise<Array<CSVParamsInterface>> {
    const parser = CSVParse({
      delimiter: ',',
      trim: true,
      skip_empty_lines: true,
    })
    readStream.pipe(parser)
    let headers: string[] = []
    let recipientIndex: number
    const params: Map<string, CSVParamsInterface> = new Map()
    for await (const row of parser) {
      if (isEmpty(headers)) {
        // @see https://stackoverflow.com/questions/11305797/remove-zero-width-space-characters-from-a-javascript-string
        const lowercaseHeaders = row.map((col: string) =>
          col.toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '')
        )
        recipientIndex = lowercaseHeaders.indexOf('recipient')
        if (recipientIndex === -1) throw new RecipientColumnMissing()
        headers = lowercaseHeaders
      } else {
        const rowWithHeaders: CSVParamsInterface = {}
        row.forEach((col: any, index: number) => {
          rowWithHeaders[headers[index]] = col
        })
        // produces {header1: value1, header2: value2, ...}
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        params.set(row[recipientIndex!], rowWithHeaders) // Deduplication
      }
    }
    logger.info({ message: 'Parsing complete' })
    return Array.from(params.values())
  }
}
