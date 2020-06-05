import { Request, Response, NextFunction } from 'express'
import logger from '@core/logger'
import { AuthService } from '@core/services'
import { EmailService } from '@email/services'

/**
 * Checks if the campaign id supplied is indeed a campaign of the 'Email' type, and belongs to the user
 * @param req 
 * @param res 
 * @param next 
 */
const isEmailCampaignOwnedByUser = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
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
const validateAndStoreCredentials = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { recipient } = req.body
    // VAPT: Only send message to user account
    const user = await AuthService.findUser(req?.session?.user?.id)
    logger.info(`[${campaignId}] VAPT: sendCampaignMessage REPLACING ${recipient} WITH USER'S EMAIL: ${user.email}`)
    await EmailService.sendCampaignMessage(+campaignId, user.email)
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
const getCampaignDetails = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const result = await EmailService.getCampaignDetails(+campaignId)
    return res.json({ campaign: result.campaign, 'num_recipients': result.numRecipients })
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
const previewFirstMessage = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const message = await EmailService.getHydratedMessage(+campaignId)
    
    if (!message) return res.json({})
    
    // eslint-disable-next-line @typescript-eslint/camelcase
    const { body, subject, replyTo: reply_to } = message
    return res.json({
      preview: {
        body,
        subject,
        // eslint-disable-next-line @typescript-eslint/camelcase
        reply_to,
      },
    })
  } catch (err){
    return next(err)
  }
}

export const EmailMiddleware = {
  isEmailCampaignOwnedByUser, 
  validateAndStoreCredentials, 
  getCampaignDetails, 
  previewFirstMessage, 
}
