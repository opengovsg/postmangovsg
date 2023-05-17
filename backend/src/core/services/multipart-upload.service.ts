import { v4 as uuid } from 'uuid'
import { S3, UploadPartCommand } from '@aws-sdk/client-s3'
import config from '@core/config'
import { configureEndpoint } from '@core/utils/aws-endpoint'
import { jwtUtils } from '@core/utils/jwt'
import { UploadService } from '@core/services'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const FILE_STORAGE_BUCKET_NAME = config.get('aws.uploadBucket')
const s3 = new S3({ ...configureEndpoint(config) })

/**
 * Get a presigned url to upload a part for multipart upload.
 */
const getPresignedPartUrl = async ({
  s3Key,
  uploadId,
  partNumber,
}: {
  s3Key: string
  uploadId: string
  partNumber: number
}): Promise<string> => {
  const params = {
    Bucket: FILE_STORAGE_BUCKET_NAME,
    Key: s3Key,
    PartNumber: partNumber,
    UploadId: uploadId,
  }
  return getSignedUrl(s3, new UploadPartCommand(params))
}

/**
 * Create a multipart upload on s3 and return the upload id and s3 key for it.
 */
const startMultipartUpload = async (
  mimeType: string,
  partCount: number
): Promise<{ transactionId: string; presignedUrls: string[] }> => {
  const s3Key = uuid()

  const params = {
    Bucket: FILE_STORAGE_BUCKET_NAME,
    Key: s3Key,
    ContentType: mimeType,
  }

  const { UploadId } = await s3.createMultipartUpload(params)

  if (!UploadId) {
    throw new Error('No upload id')
  }

  const transactionId = jwtUtils.sign({
    uploadId: UploadId,
    s3Key,
  })

  const presignedUrlPromises = []
  for (let partNumber = 1; partNumber <= partCount; partNumber++) {
    presignedUrlPromises.push(
      getPresignedPartUrl({ s3Key, uploadId: UploadId, partNumber })
    )
  }
  const presignedUrls = await Promise.all(presignedUrlPromises)

  return {
    transactionId,
    presignedUrls,
  }
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
}): Promise<{ s3Key: string; etag?: string }> => {
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

  const { ETag: etag } = await s3.completeMultipartUpload(params)
  return { s3Key, etag }
}

export const MultipartUploadService = {
  startMultipartUpload,
  completeMultipartUpload,
}
