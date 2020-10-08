import { Request, Response, NextFunction } from 'express'
import { EmailService } from '@email/services'
import { createCustomLogger } from '@core/utils/logger'

const logger = createCustomLogger(module)

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
    if (campaign) {
      return next()
    } else {
      logger.error({
        message: 'Campaign does not belong to user',
        campaignId,
        userId,
        action: 'isEmailCampaignOwnedByUser',
      })
      return res.sendStatus(403)
    }
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
  const { campaignId } = req.params
  const { recipient } = req.body
  const logMeta = {
    campaignId,
    recipient,
    action: 'validateAndStoreCredentials',
  }
  try {
    await EmailService.sendCampaignMessage(+campaignId, recipient)
    await EmailService.setCampaignCredential(+campaignId)
  } catch (err) {
    logger.error({
      message: 'Failed to validate and store credentials',
      error: err,
      ...logMeta,
    })
    return res.status(400).json({ message: `${err.message}` })
  }
  logger.info({ message: 'Validated and stored credentials', ...logMeta })
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
    logger.info({
      message: 'Retreived campaign details',
      campaignId,
      action: 'getCampaignDetails',
    })
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

    const { body, subject, replyTo } = message
    return res.json({
      preview: {
        body,
        subject,
        reply_to: replyTo,
      },
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
}
