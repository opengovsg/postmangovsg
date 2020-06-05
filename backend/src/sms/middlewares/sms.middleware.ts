import { Request, Response, NextFunction } from 'express'
import { ChannelType } from '@core/constants'
import { CredentialService } from '@core/services'
import { SmsService } from '@sms/services'

/**
 * Checks if the campaign id supplied is indeed a campaign of the 'SMS' type, and belongs to the user
 * @param req 
 * @param res 
 * @param next 
 */
const isSmsCampaignOwnedByUser = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const userId = req.session?.user?.id 
    const campaign = await SmsService.findCampaign(+campaignId, +userId)
    return campaign ? next() : res.sendStatus(403)
  } catch (err) {
    return next(err)
  }
}

/**
 * Parse twilio credentials from request body, setting it to res.locals.credentials to be passed downstream
 * @param req 
 * @param res 
 * @param next 
 */
const getCredentialsFromBody = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const {
    'twilio_account_sid': accountSid,
    'twilio_api_key': apiKey,
    'twilio_api_secret': apiSecret,
    'twilio_messaging_service_sid': messagingServiceSid,
  } = req.body

  res.locals.credentials = {
    accountSid,
    apiKey,
    apiSecret,
    messagingServiceSid,
  }
  return next()
}

/**
 * Parse label from request body. Retrieve credentials associated with this label, 
 * and set the credentials to res.locals.credentials, credName to res.locals.credentialName, to be passed downstream
 * @param req 
 * @param res 
 * @param next 
 */
const getCredentialsFromLabel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { label } = req.body
  const userId = req.session?.user?.id
  try {
    // if label provided, fetch from aws secrets
    const userCred = await CredentialService.getUserCredential(+userId, label)
    if (!userCred) {
      res.status(400).json({ message: 'User credentials cannot be found' })
      return
    }
    const credentials = await CredentialService.getTwilioCredentials(userCred.credName)
    res.locals.credentials = credentials
    res.locals.credentialName = userCred.credName
    return next()
  } catch (err) {
    return next(err)
  }
}

/**
 * Sends a test message. If the test message succeeds, 
 * store the credentials in AWS secrets manager and db.
 * Set the credentialName and channelType in res.locals to be passed downstream
 * @param req 
 * @param res 
 */
const validateAndStoreCredentials = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const { recipient } = req.body
  const { campaignId } = req.params
  const { credentials, credentialName } = res.locals
  try {
    if (campaignId) {
      // Sends first hydrated message from campaign
      await SmsService.sendCampaignMessage(+campaignId, recipient, credentials)
    } else {
      // Sends generic validation message if campaignId not specified
      await SmsService.sendValidationMessage(recipient, credentials)
    }
    // If credentialName exists, credential has already been stored
    if (credentialName) {
      return next()
    }
  }
  catch (err) {
    return res.status(400).json({ message: `${err}` })
  }
  try {
    // Store credentials in AWS secrets manager
    const stringifiedCredential = JSON.stringify(credentials)
    const credentialName = await SmsService.getEncodedHash(stringifiedCredential)
    await CredentialService.storeCredential(credentialName, stringifiedCredential)
    // Pass on to next middleware/handler
    res.locals.credentialName = credentialName
    res.locals.channelType = ChannelType.SMS
    next()
  } catch (err) {
    return res.status(400).json({ message: `${err.message}` })
  }
}

/**
 * Associate campaign with a credential
 * @param req 
 * @param res 
 * @param next 
 */
const setCampaignCredential = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { campaignId } = req.params
    const { credentialName } = res.locals
    if (!credentialName) {
      throw new Error('Credential does not exist')
    }
    await SmsService.setCampaignCredential(+campaignId, credentialName)
    return res.json({ message: 'OK' })
  } catch (err) {
    next(err)
  }
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
    const result = await SmsService.getCampaignDetails(+campaignId)
    // TODO: Why is numRecipients not part of campaign?
    return res.json({ campaign: (await result).campaign, 'num_recipients': result.numRecipients })
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
    return res.json({
      preview: await SmsService.getHydratedMessage(+campaignId),
    })
  } catch (err) {
    return next(err)
  }
}

export const SmsMiddleware = { 
  getCredentialsFromBody,
  getCredentialsFromLabel,
  isSmsCampaignOwnedByUser,
  validateAndStoreCredentials,
  setCampaignCredential, 
  getCampaignDetails,
  previewFirstMessage, 
}
