import { Request, Response, NextFunction } from 'express'
import S3Client from '@core/services/s3-client.class'

import logger from '@core/logger'
import { UploadService } from '@core/services'

const s3Client = new S3Client()

/**
 * Start an upload by returning a presigned url to the user to upload file to s3 bucket
 * @param req
 * @param res
 */
const uploadStartHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const contentType = req.query['mime_type']
    const { presignedUrl, signedKey } = await UploadService.getUploadParameters(
      contentType
    )

    return res.status(200).json({
      presigned_url: presignedUrl,
      transaction_id: signedKey,
    })
  } catch (err) {
    logger.error(`${err.message}`)
    return res.status(500).json({ message: 'Unable to generate presigned URL' })
  }
}

/**
 * Starts multipart upload.
 * Once started, it should either be completed when all the parts are uploaded or aborted.
 * @param req
 * @param res
 * @param next
 */
const startMultipartUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const contentType = req.query['mime_type']

    const transactionId = await s3Client.startMultipartUpload(contentType)

    return res.json({
      transaction_id: transactionId,
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * Get a presigned url for multipart upload.
 * @param req
 * @param res
 * @param next
 */
const getMultipartUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const transactionId = req.query['transaction_id']
    const partNumber = req.query['part_number']

    const presignedUrl = await s3Client.getPresignedPartUrl({
      transactionId,
      partNumber,
    })

    return res.json({
      presigned_url: presignedUrl,
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * Complete a multipart upload.
 * Adds the s3Key to res.locals so that the middleware downstream can access it.
 * @param req
 * @param res
 * @param next
 */
const completeMultipart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const {
      transaction_id: transactionId,
      part_count: partCount,
      etags,
    } = req.body

    const s3Key = await s3Client.completeMultipartUpload({
      transactionId,
      partCount,
      etags,
    })

    // Passing the s3Key to the next middleware
    res.locals.s3Key = s3Key

    return next()
  } catch (err) {
    return next(err)
  }
}

export const UploadMiddleware = {
  uploadStartHandler,
  startMultipartUpload,
  getMultipartUrl,
  completeMultipart,
}
