import config from '@core/config'
import { configureEndpoint } from '@core/utils/aws-endpoint'

import S3 from 'aws-sdk/clients/s3'

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

  download(key: string, etag?: string): NodeJS.ReadableStream {
    const params: S3.GetObjectRequest = {
      Bucket: FILE_STORAGE_BUCKET_NAME,
      Key: key,
      ...(etag ? { IfMatch: etag } : {}),
    }
    return this.s3.getObject(params).createReadStream()
  }
}
