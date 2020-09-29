import { Request, Response, NextFunction } from 'express'
import { EmailService, CustomDomainService } from '@email/services'
import config from '@core/config'
import { parseFromAddress } from '@core/utils/from-address'

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

    const { body, subject, replyTo, from } = message
    return res.json({
      preview: {
        body,
        subject,
        reply_to: replyTo,
        from,
      },
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * Checks that the from address is either the user's email or the default app email
 */
const isFromAddressAccepted = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { from } = req.body
  const userEmail = req.session?.user?.email
  const defaultEmail = config.get('mailFrom')

  // Since from addresses with display name are accepted, we need to extract just the email address
  const { name, fromAddress } = parseFromAddress(from)

  if (fromAddress !== userEmail && from !== defaultEmail) {
    return res.status(400).json({ message: "Invalid 'from' email address." })
  }
  res.locals.fromName = name
  res.locals.from = fromAddress

  return next()
}

/**
 * Verifies that the 'from' address provided is valid
 */
const existsFromAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { from } = req.body
  const defaultEmail = config.get('mailFrom')
  if (from === defaultEmail) return next()

  try {
    const { fromName, from: fromAddress } = res.locals
    const exists = await CustomDomainService.existsFromAddress(
      fromName,
      fromAddress
    )
    if (!exists) throw new Error('From Address has not been verified.')
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }
  return next()
}

/**
 * Verifies the user's email address to see if it can be used as custom 'from' address
 */
const verifyFromAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { from } = req.body
  const defaultEmail = config.get('mailFrom')
  if (from === defaultEmail) return next()

  try {
    const { from: fromAddress } = res.locals
    await CustomDomainService.verifyFromAddress(fromAddress)
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
  const { from } = req.body
  const defaultEmail = config.get('mailFrom')
  if (from === defaultEmail) return res.sendStatus(200)

  try {
    const { fromName, from: fromAddress } = res.locals
    await CustomDomainService.storeFromAddress(fromName, fromAddress)
  } catch (err) {
    return next(err)
  }
  return res.status(200).json({ email: from })
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
  const defaultEmail = config.get('mailFrom')
  const result = []

  try {
    const fromAddress = await CustomDomainService.getCustomFromAddress(email)
    if (fromAddress) result.push(fromAddress)
    result.push(defaultEmail)
  } catch (err) {
    return next(err)
  }

  return res.status(200).json({ from: result })
}

/**
 * Sends a test email from the specified from address
 */
const sendValidationMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { recipient, from } = req.body
  try {
    await CustomDomainService.sendValidationMessage(recipient, from)
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
  existsFromAddress,
  isFromAddressAccepted,
  sendValidationMessage,
}
