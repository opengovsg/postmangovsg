import { Request, Response } from 'express'

import logger from '@core/logger'
import { TemplateService } from '@core/services'

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
    const {
      presignedUrl,
      signedKey,
    } = await TemplateService.getUploadParameters(contentType)

    return res.status(200).json({
      presigned_url: presignedUrl,
      transaction_id: signedKey,
    })
  } catch (err) {
    logger.error(`${err.message}`)
    return res.status(500).json({ message: 'Unable to generate presigned URL' })
  }
}

export const TemplateMiddleware = {
  uploadStartHandler,
}
