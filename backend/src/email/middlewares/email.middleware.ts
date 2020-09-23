import { Request, Response, NextFunction } from 'express'
import { EmailService, CustomDomainService } from '@email/services'

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

/**
 * Verifies the from email address in different ways:
 * 1. Checks if email is already verified
 * 2. With AWS to ensure that we can use the email address to send
 * 3. Checks the domain's dns to ensure that the cnames are there
 */
const verifyFromAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const email = req.session?.user?.email
  try {
    const isVerified = await CustomDomainService.isEmailVerified(email)
    if (isVerified) return res.status(200).json({ email })

    const dkimTokens = await CustomDomainService.verifyEmailWithAWS(email)

    await CustomDomainService.verifyCnames(dkimTokens, email)
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
  return next()
}

/**
 * Stores the verified email address that we can use to send out emails.
 */
const storeFromAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const email = req.session?.user?.email
  try {
    await CustomDomainService.storeFromAddress(email)
  } catch (err) {
    return next(err)
  }
  return res.status(200).json({ email })
}

/**
 * Verifies if the user's email address can be used as custom 'from' address
 */
const isEmailVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const email = req.session?.user?.email
  try {
    const isVerified = await CustomDomainService.isEmailVerified(email)
    if (isVerified) return res.status(200).json({ email })
  } catch (err) {
    return next(err)
  }
  return res.status(200).json({ email: '' })
}

export const EmailMiddleware = {
  isEmailCampaignOwnedByUser,
  validateAndStoreCredentials,
  getCampaignDetails,
  previewFirstMessage,
  verifyFromAddress,
  storeFromAddress,
  isEmailVerified,
}
