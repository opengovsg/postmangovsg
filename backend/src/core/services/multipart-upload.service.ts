import { v4 as uuid } from 'uuid'
import S3 from 'aws-sdk/clients/s3'

import config from '@core/config'

import { configureEndpoint } from '@core/utils/aws-endpoint'
import { jwtUtils } from '@core/utils/jwt'

import { UploadService } from '@core/services'

const FILE_STORAGE_BUCKET_NAME = config.get('aws.uploadBucket')
const s3 = new S3({
  signatureVersion: 'v4',
  ...configureEndpoint(config),
})

/**
 * Create a multipart upload on s3 and return the upload id and s3 key for it.
 */
const startMultipartUpload = async (contentType: string): Promise<string> => {
  const s3Key = uuid()

  const params = {
    Bucket: FILE_STORAGE_BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
  }

  const { UploadId } = await s3.createMultipartUpload(params).promise()

  if (!UploadId) throw new Error('no upload id')

  const transactionId = jwtUtils.sign({
    uploadId: UploadId,
    s3Key,
  })

  return transactionId
}

/**
 * Get a presigned url to upload a part for multipart upload.
 */
const getPresignedPartUrl = async ({
  transactionId,
  partNumber,
}: {
  transactionId: string
  partNumber: number
}): Promise<string> => {
  const { s3Key, uploadId } = UploadService.extractParamsFromJwt(
    transactionId
  ) as {
    s3Key: string
    uploadId: string
  }
  const params = {
    Bucket: FILE_STORAGE_BUCKET_NAME,
    Key: s3Key,
    PartNumber: partNumber,
    UploadId: uploadId,
  }

  const presignedUrl = await s3.getSignedUrlPromise('uploadPart', params)

  return presignedUrl
}

/**
 * Complete the multipart upload.
 * Returns the s3Key for the upload.
 */
const completeMultipartUpload = async ({
  transactionId,
  partCount,
  etags,
}: {
  transactionId: string
  partCount: number
  etags: Array<string>
}): Promise<string> => {
  const parts = []
  for (let i = 0; i < partCount; i++) {
    parts.push({
      ETag: etags[i],
      PartNumber: i + 1,
    })
  }
  const { s3Key, uploadId } = UploadService.extractParamsFromJwt(
    transactionId
  ) as {
    s3Key: string
    uploadId: string
  }

  const params = {
    Bucket: FILE_STORAGE_BUCKET_NAME,
    Key: s3Key,
    MultipartUpload: {
      Parts: parts,
    },
    UploadId: uploadId,
  }

  await s3.completeMultipartUpload(params).promise()
  return s3Key
}

export const MultipartUploadService = {
  startMultipartUpload,
  getPresignedPartUrl,
  completeMultipartUpload,
}
