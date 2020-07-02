import { Request, Response, NextFunction } from 'express'
import S3Client from '@core/services/s3-client.class'
import { EmailService } from '@email/services'

const s3Client = new S3Client()

/**
 * Checks if the campaign id supplied is indeed a campaign of the 'Email' type, and belongs to the user
 * @param req
 * @param res
 * @param next
 */
const isEmailCampaignOwnedByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { campaignId } = req.params
  const userId = req.session?.user?.id
  try {
    const campaign = await EmailService.findCampaign(+campaignId, +userId)
    return campaign ? next() : res.sendStatus(403)
  } catch (err) {
    return next(err)
  }
}

/**
 * Sends a test message. If the test message succeeds, store the credentials
 * @param req
 * @param res
 */
const validateAndStoreCredentials = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { recipient } = req.body
    await EmailService.sendCampaignMessage(+campaignId, recipient)
    await EmailService.setCampaignCredential(+campaignId)
  } catch (err) {
    return res.status(400).json({ message: `${err.message}` })
  }
  return res.json({ message: 'OK' })
}

/**
 * Gets details of a campaign and the number of recipients that have been uploaded for this campaign
 * @param req
 * @param res
 * @param next
 */
const getCampaignDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const result = await EmailService.getCampaignDetails(+campaignId)
    return res.json(result)
  } catch (err) {
    return next(err)
  }
}

/**
 * Retrieves a message for this campaign
 * @param req
 * @param res
 * @param next
 */
const previewFirstMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const message = await EmailService.getHydratedMessage(+campaignId)

    if (!message) return res.json({})

    const { body, subject, replyTo: reply_to } = message
    return res.json({
      preview: {
        body,
        subject,
        reply_to,
      },
    })
  } catch (err) {
    return next(err)
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

    await s3Client.completeMultipartUpload({
      transactionId,
      partCount,
      etags,
    })

    // Not sure what i should return here
    return res.json({
      transaction_id: transactionId,
    })
  } catch (err) {
    return next(err)
  }
}

export const EmailMiddleware = {
  isEmailCampaignOwnedByUser,
  validateAndStoreCredentials,
  getCampaignDetails,
  previewFirstMessage,
  startMultipartUpload,
  getMultipartUrl,
  completeMultipart,
}
