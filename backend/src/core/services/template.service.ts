import { v4 as uuid } from 'uuid'
import S3 from 'aws-sdk/clients/s3'
import config from '@core/config'
import logger from '@core/logger'
import { jwtUtils } from '@core/utils/jwt'

const FILE_STORAGE_BUCKET_NAME = config.get('aws.uploadBucket')
const s3 = new S3({
  signatureVersion: 'v4',
  region: config.get('aws.awsRegion'),
})

/**
 * Returns a presigned url for uploading file to s3 bucket
 * @param contentType 
 */
const getUploadParameters = async (contentType: string): Promise<{presignedUrl: string; signedKey: string}> => {
  const s3Key = uuid()
  
  const params = {
    Bucket: FILE_STORAGE_BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
    Expires: 180, // seconds
  }
  
  const signedKey = jwtUtils.sign(s3Key)
  
  const presignedUrl = await s3.getSignedUrlPromise('putObject', params)
  
  return { presignedUrl, signedKey }
}
  
/**
 * Decodes jwt
 * @param transactionId 
 */
const extractS3Key = (transactionId: string): string => {
  let decoded: string
  try {
    decoded = jwtUtils.verify(transactionId) as string
  } catch (err) {
    logger.error(`${err.stack}`)
    throw new Error('Invalid transactionId provided')
  }
  return decoded as string
}

export const TemplateService = {
  getUploadParameters,
  extractS3Key,
}