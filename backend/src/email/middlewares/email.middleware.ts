import { Request, Response, NextFunction } from 'express'
import { EmailService, CustomDomainService } from '@email/services'
import { parseFromAddress } from '@core/utils/from-address'
import { AuthService } from '@core/services'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

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
  const defaultEmail = config.get('mailFrom')

  if (config.get('emailFallback.activate') && from !== defaultEmail) {
    return res.status(503).json({
      message:
        'Unable to use a custom from address due to downtime. Please use the default from address instead.',
    })
  }

  const userEmail =
    req.session?.user?.email ||
    (await AuthService.findUser(req.session?.user?.id))?.email

  // Since from addresses with display name are accepted, we need to extract just the email address
  const { name, fromAddress } = parseFromAddress(from)

  if (fromAddress !== userEmail && from !== defaultEmail) {
    logger.error({
      message: "Invalid 'from' email address",
      from,
      userEmail,
      defaultEmail,
      fromAddress,
      action: 'isFromAddressAccepted',
    })
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
  const { fromName, from: fromAddress } = res.locals

  try {
    const exists = await CustomDomainService.existsFromAddress(
      fromName,
      fromAddress
    )
    if (!exists) throw new Error('From Address has not been verified.')
  } catch (err) {
    logger.error({
      message: "Invalid 'from' email address",
      from,
      defaultEmail,
      fromName,
      fromAddress,
      error: err,
      action: 'existsFromAddress',
    })
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
  const { from: fromAddress } = res.locals

  try {
    await CustomDomainService.verifyFromAddress(fromAddress)
  } catch (err) {
    logger.error({
      message: "Failed to verify 'from' email address",
      from,
      defaultEmail,
      fromAddress,
      error: err,
      action: 'verifyFromAddress',
    })
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
  if (from === defaultEmail) {
    return res.sendStatus(200)
  }
  const { fromName, from: fromAddress } = res.locals

  try {
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
  const defaultEmail = config.get('mailFrom')
  const result = [defaultEmail]

  if (!config.get('emailFallback.activate')) {
    const email =
      req.session?.user?.email ||
      (await AuthService.findUser(req.session?.user?.id))?.email
    try {
      const fromAddress = await CustomDomainService.getCustomFromAddress(email)
      // Display the custom address first
      if (fromAddress) result.unshift(fromAddress)
    } catch (err) {
      return next(err)
    }
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
    logger.error({
      message:
        "Failed to send validation email from the specified 'from' email address",
      recipient,
      from,
      error: err,
      action: 'sendValidationMessage',
    })
    return res.status(400).json({ message: err.message })
  }
  return next()
}

/**
 *  duplicate a campaign and its template
 * @param req
 * @param res
 * @param next
 */
const duplicateCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { name } = req.body
    const campaign = await EmailService.duplicateCampaign({
      campaignId: +campaignId,
      name,
    })
    if (!campaign) {
      return res.status(400).json({
        message: `Unable to duplicate campaign with these parameters`,
      })
    }
    logger.info({
      message: 'Successfully copied campaign',
      campaignId: campaign.id,
      action: 'duplicateCampaign',
    })
    return res.status(201).json({
      id: campaign.id,
      name: campaign.name,
      created_at: campaign.createdAt,
      type: campaign.type,
      protect: campaign.protect,
      demo_message_limit: campaign.demoMessageLimit,
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
  verifyFromAddress,
  storeFromAddress,
  getCustomFromAddress,
  existsFromAddress,
  isFromAddressAccepted,
  sendValidationMessage,
  duplicateCampaign,
}
