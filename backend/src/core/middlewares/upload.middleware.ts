import { Request, Response, NextFunction } from 'express'

import { loggerWithLabel } from '@core/logger'
import { UploadService, MultipartUploadService } from '@core/services'

const logger = loggerWithLabel(module)

/**
 * Start an upload by returning a presigned url to the user to upload file to s3 bucket
 * @param req
 * @param res
 */
const uploadStartHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { mime_type: contentType, md5 } = req.query
  const logMeta = { contentType, md5, action: 'uploadStartHandler' }
  try {
    const { presignedUrl, signedKey } = await UploadService.getUploadParameters(
      contentType as string,
      md5 as string
    )

    logger.info({ message: 'Start file upload', presignedUrl })
    return res.status(200).json({
      presigned_url: presignedUrl,
      transaction_id: signedKey,
    })
  } catch (err) {
    logger.error({
      message: 'Unable to generate presigned URL',
      error: err,
      ...logMeta,
    })
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
  const { mime_type: mimeType, part_count: partCount } = req.query
  const logMeta = { mimeType, partCount, action: 'startMultipartUpload' }
  try {
    const data = await MultipartUploadService.startMultipartUpload(
      mimeType as string,
      +(partCount as string)
    )
    logger.info({ messsage: 'Start multipart file upload', ...logMeta })
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
  res: Response,
  next: NextFunction
): Promise<void> => {
  const {
    transaction_id: transactionId,
    part_count: partCount,
    etags,
  } = req.body
  const logMeta = { transactionId, partCount, action: 'completeMultipart' }
  try {
    const { etag } = await MultipartUploadService.completeMultipartUpload({
      transactionId,
      partCount,
      etags,
    })
    res.locals.etag = etag

    logger.info({ message: 'Multipart file upload completed', ...logMeta })
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
