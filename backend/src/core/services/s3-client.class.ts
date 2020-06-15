import S3 from 'aws-sdk/clients/s3'
import CSVParse from 'csv-parse'
import { isEmpty } from 'lodash'

import config from '@core/config'
import logger from '@core/logger'
import { configureEndpoint } from '@core/utils/aws-endpoint'
import {
  RecipientColumnMissing,
  UnexpectedDoubleQuoteError,
} from '@core/errors/s3.errors'

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
    try {
      readStream.on('error', (err) => {
        // Pass error from s3 to csv parser
        parser.emit('error', err)
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
    } catch (err) {
      if (err.message.includes('Invalid Opening Quote'))
        throw new UnexpectedDoubleQuoteError()
      if (err.message.includes('Invalid Closing Quote'))
        throw new UnexpectedDoubleQuoteError()
      throw err
    }
  }

  /**
   * Download CSV file from S3 and process it into message.
   * The messages are formed from the template and parameters specified in the csv.
   *
   * @param campaignId
   * @param s3Key
   */
  async getCsvFile(s3Key: string): Promise<Array<CSVParamsInterface>> {
    const downloadStream = this.download(s3Key)
    const fileContents = await this.parseCsv(downloadStream)
    return fileContents
  }
}
