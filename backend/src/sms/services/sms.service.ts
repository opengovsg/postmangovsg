import S3 from 'aws-sdk/clients/s3'
import CSVParse from 'csv-parse'

import config from '@core/config'
import logger from '@core/logger'

const FILE_STORAGE_BUCKET_NAME = config.aws.uploadBucket

class SmsService {
  s3: S3
  constructor (s3: S3) {
    this.s3 = s3
  }

  download (key: string) {
    let params: S3.GetObjectRequest = {
      Bucket: FILE_STORAGE_BUCKET_NAME,
      Key: key,
    }
    return this.s3.getObject(params).createReadStream()
  }

  parseCsv (readStream: NodeJS.ReadableStream) {
    return new Promise((resolve, reject) => {
      const parser = CSVParse({ delimiter: ',' })

      parser.on('data', async (row) => {
        try {
          // TODO: do something with row
          console.log(row)
          resolve()
        } catch (err) {
          parser.end()
          reject(err)
        }
      })

      parser.on('error', function (err) {
        parser.end()
        reject(err)
      })

      parser.on('end', async () => {
        logger.info({ message: 'Done parsing' })
      })

      readStream.pipe(parser)

    })
  }
}

export { SmsService }