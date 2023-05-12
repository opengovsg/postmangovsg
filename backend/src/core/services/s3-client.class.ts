import { GetObjectRequest, S3 } from '@aws-sdk/client-s3'

import config from '@core/config'
import { configureEndpoint } from '@core/utils/aws-endpoint'

const FILE_STORAGE_BUCKET_NAME = config.get('aws.uploadBucket')

export default class S3Client {
  s3: S3
  constructor(s3?: S3) {
    this.s3 = s3 || new S3({ ...configureEndpoint(config) })
  }

  async download(key: string, etag?: string): Promise<NodeJS.ReadableStream> {
    const params: GetObjectRequest = {
      Bucket: FILE_STORAGE_BUCKET_NAME,
      Key: key,
      ...(etag ? { IfMatch: etag } : {}),
    }
    const obj = await this.s3.getObject(params)
    return obj.Body as NodeJS.ReadableStream
  }
}
