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
 * Verifies the user's email address to see if it can be used as custom 'from' address
 */
const verifyFromAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const email = req.session?.user?.email
  try {
    await CustomDomainService.verifyFromAddress(email)
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
const getCustomFromAddress = async (
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

/**
 * Verifies that the 'from' address provided is valid
 */
const isFromAddressVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { from } = req.body
  if (from === '') return next()

  const email = req.session?.user?.email

  // from should be the same as email if it is not default
  if (from !== email)
    return res.status(400).json({ message: "Invalid 'from' email address." })
  try {
    await CustomDomainService.isFromAddressVerified(from)
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
  return next()
}

export const EmailMiddleware = {
  isEmailCampaignOwnedByUser,
  validateAndStoreCredentials,
  getCampaignDetails,
  previewFirstMessage,
  verifyFromAddress,
  storeFromAddress,
  getCustomFromAddress,
  isFromAddressVerified,
}
