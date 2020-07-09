import { Request, Response, NextFunction } from 'express'

import logger from '@core/logger'
import { UploadService } from '@core/services'

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
    const { mime_type: mimeType, part_count: partCount } = req.query
    const data = await UploadService.startMultipartUpload(mimeType, partCount)
    return res.json({
      transaction_id: data.transactionId,
      presigned_urls: data.presignedUrls,
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
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      transaction_id: transactionId,
      part_count: partCount,
      etags,
    } = req.body

    const s3Key = await UploadService.completeMultipartUpload({
      transactionId,
      partCount,
      etags,
    })

    console.log(s3Key)

    next()
  } catch (err) {
    next(err)
  }
}

export const UploadMiddleware = {
  uploadStartHandler,
  startMultipartUpload,
  completeMultipart,
}
