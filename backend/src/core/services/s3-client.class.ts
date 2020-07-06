import S3 from 'aws-sdk/clients/s3'

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
   *
   * @param campaignId
   * @param s3Key
   */
  async getCsvFile(s3Key: string): Promise<Array<CSVParams>> {
    const downloadStream = this.download(s3Key)
    const fileContents = await ParseCsvService.parseCsv(downloadStream)
    return fileContents
  }
}
