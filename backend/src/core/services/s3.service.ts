import S3 from 'aws-sdk/clients/s3'
import CSVParse from 'csv-parse'
import { isEmpty } from 'lodash'

import config from '@core/config'
import logger from '@core/logger'
import { RecipientColumnMissing } from '@core/errors/s3.errors'

type CSVParamsInterface = {[key: string]: string}
const FILE_STORAGE_BUCKET_NAME = config.aws.uploadBucket

class S3Service {
  s3: S3
  constructor(s3: S3) {
    this.s3 = s3
  }

  download(key: string): NodeJS.ReadableStream {
    const params: S3.GetObjectRequest = {
      Bucket: FILE_STORAGE_BUCKET_NAME,
      Key: key,
    }
    return this.s3.getObject(params).createReadStream()
  }

  async parseCsv(readStream: NodeJS.ReadableStream): Promise<Array<CSVParamsInterface>> {
    const parser = CSVParse({ delimiter: ',' })
    readStream.pipe(parser)
    let headers: string[] = []
    const params: Array<CSVParamsInterface> = []
    for await (const row of parser) {
      if (isEmpty(headers)) {
        const lowercaseHeaders = row.map((col: string) => col.toLowerCase())
        if (lowercaseHeaders.indexOf('recipient') === -1) throw new RecipientColumnMissing()
        headers = lowercaseHeaders
      } else {
        const rowWithHeaders: CSVParamsInterface = {}
        row.forEach((col: any, index: number) => {
          rowWithHeaders[headers[index]] = col
        })
        // produces {header1: value1, header2: value2, ...}
        params.push(rowWithHeaders)
      }
    }
    logger.info({ message: 'Parsing complete' })
    return params
  }
}

export { S3Service }