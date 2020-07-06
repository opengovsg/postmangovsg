import S3 from 'aws-sdk/clients/s3'
import { v4 as uuid } from 'uuid'

import { jwtUtils } from '@core/utils/jwt'
import config from '@core/config'
import logger from '@core/logger'
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

  /**
   * Create a multipart upload on s3 and return the upload id and s3 key for it.
   */
  async startMultipartUpload(contentType: string): Promise<string> {
    const s3Key = uuid()

    const params = {
      Bucket: FILE_STORAGE_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    }

    const uploadData = await this.s3.createMultipartUpload(params).promise()

    if (!uploadData.UploadId) throw new Error('no upload id')

    const transactionId = jwtUtils.sign({
      uploadId: uploadData.UploadId,
      s3Key,
    })

    return transactionId
  }

  /**
   * Get a presigned url to upload a part for multipart upload.
   */
  async getPresignedPartUrl({
    transactionId,
    partNumber,
  }: {
    transactionId: string
    partNumber: number
  }): Promise<string> {
    const { s3Key, uploadId } = this.extractS3KeyAndUploadId(transactionId)
    const params = {
      Bucket: FILE_STORAGE_BUCKET_NAME,
      Key: s3Key,
      PartNumber: partNumber,
      UploadId: uploadId,
    }

    const presignedUrl = await this.s3.getSignedUrlPromise('uploadPart', params)

    return presignedUrl
  }

  /**
   * Complete the multipart upload.
   * Returns the s3Key for the upload.
   */
  async completeMultipartUpload({
    transactionId,
    partCount,
    etags,
  }: {
    transactionId: string
    partCount: number
    etags: Array<string>
  }): Promise<string> {
    const parts = []
    for (let i = 0; i < partCount; i++) {
      parts.push({
        ETag: etags[i],
        PartNumber: i + 1,
      })
    }
    const { s3Key, uploadId } = this.extractS3KeyAndUploadId(transactionId)

    const params = {
      Bucket: FILE_STORAGE_BUCKET_NAME,
      Key: s3Key,
      MultipartUpload: {
        Parts: parts,
      },
      UploadId: uploadId,
    }

    await this.s3.completeMultipartUpload(params).promise()
    return s3Key
  }

  /**
   * Decodes jwt
   * @param transactionId
   */
  extractS3KeyAndUploadId(
    transactionId: string
  ): { s3Key: string; uploadId: string } {
    let decoded: { s3Key: string; uploadId: string }
    try {
      decoded = jwtUtils.verify(transactionId) as {
        s3Key: string
        uploadId: string
      }
    } catch (err) {
      logger.error(`${err.stack}`)
      throw new Error('Invalid transactionId provided')
    }
    return decoded
  }
}
