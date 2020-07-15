import S3 from 'aws-sdk/clients/s3'
import retry from 'async-retry'

import config from '@core/config'
import { configureEndpoint } from '@core/utils/aws-endpoint'

import { CSVParams } from '@core/types'
import { ParseCsvService } from '@core/services'

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
   * Download CSV file from S3 and process it into message.
   * The messages are formed from the template and parameters specified in the csv.
   * Retries when s3 can't find the s3Key. This could be due to s3's eventual consistency.
   * @param campaignId
   * @param s3Key
   */
  async getCsvFile(s3Key: string): Promise<Array<CSVParams>> {
    return await retry(
      async (bail) => {
        try {
          const downloadStream = this.download(s3Key)
          const fileContents = await ParseCsvService.parseCsv(downloadStream)
          return fileContents
        } catch (e) {
          if (e.code !== 'NoSuchKey') {
            bail(e)
            return []
          }
          throw e
        }
      },
      {
        retries: 5,
        minTimeout: 1000,
        maxTimeout: 3 * 1000,
        factor: 1,
      }
    )
  }
}
