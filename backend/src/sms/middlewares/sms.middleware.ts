import { Handler, NextFunction, Request, Response } from 'express'
import { ChannelType, DefaultCredentialName } from '@core/constants'
import { CredentialService } from '@core/services'
import { SmsService } from '@sms/services'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { formatDefaultCredentialName } from '@core/utils'

export interface SmsMiddleware {
  getCredentialsFromBody: Handler
  getCredentialsFromLabelCampaign: Handler
  getCredentialsFromLabelTransactional: Handler
  isSmsCampaignOwnedByUser: Handler
  validateAndStoreCredentials: Handler
  setCampaignCredential: Handler
  getCampaignDetails: Handler
  previewFirstMessage: Handler
  disabledForDemoCampaign: Handler
  duplicateCampaign: Handler
  canValidateCredentials: Handler
}

export const InitSmsMiddleware = (
  credentialService: CredentialService
): SmsMiddleware => {
  const logger = loggerWithLabel(module)

  /**
   * Checks if the campaign id supplied is indeed a campaign of the 'SMS' type, and belongs to the user
   * @param req
   * @param res
   * @param next
   */
  const isSmsCampaignOwnedByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const { campaignId } = req.params
      const userId = req.session?.user?.id
      const campaign = await SmsService.findCampaign(+campaignId, +userId)
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
   * Disable a request made for a demo campaign
   * @param req
   * @param res
   * @param next
   */
  const disabledForDemoCampaign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const userId = req.session?.user?.id
      const campaign = await SmsService.findCampaign(
        +req.params.campaignId,
        userId
      )
      if (campaign.demoMessageLimit) {
        return res.status(400).json({
          message: `Action not allowed for demo campaign`,
        })
      }
      return next()
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
  const getCredentialsFromBody = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    const {
      twilio_account_sid: accountSid,
      twilio_api_key: apiKey,
      twilio_api_secret: apiSecret,
      twilio_messaging_service_sid: messagingServiceSid,
    } = req.body

    res.locals.credentials = {
      accountSid,
      apiKey,
      apiSecret,
      messagingServiceSid,
    }
    return next()
  }

  const getDemoCredentialName = (label: string): string => {
    // Demo campaigns can only use default credentials
    if (label === DefaultCredentialName.SMS) {
      return formatDefaultCredentialName(label)
    } else {
      throw new Error(
        `Demo campaign must use demo credentials. ${label} is not allowed.`
      )
    }
  }
  const getCredentialName = async (
    label: string,
    userId: number
  ): Promise<string> => {
    // Non-demo campaigns cannot use default credentials
    const userCred = await credentialService.getUserCredential(userId, label)
    if (!userCred) {
      throw new Error('User credential cannot be found')
    }
    return userCred.credName
  }

  /**
   * Parse label from request body. Retrieve credentials associated with this label,
   * and set the credentials to res.locals.credentials, credName to res.locals.credentialName, to be passed downstream
   * @param req
   * @param res
   * @param next
   */
  const getCredentialsFromLabelCampaign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    const { campaignId } = req.params // May be undefined if invoked from settings page
    const { label } = req.body
    const userId = req.session?.user?.id
    const logMeta = {
      campaignId,
      label,
      action: 'getCredentialsFromLabelCampaign',
    }
    try {
      /* Determine if credential name can be used */
      const campaign = campaignId
        ? await SmsService.findCampaign(+campaignId, userId)
        : null
      const canUseDemoCredentials =
        campaign?.demoMessageLimit && campaign?.demoMessageLimit > 0
      if (!canUseDemoCredentials && label === DefaultCredentialName.SMS) {
        throw new Error(
          `Campaign cannot use demo credentials. ${label} is not allowed.`
        )
      }
      const credentialName = canUseDemoCredentials
        ? getDemoCredentialName(label)
        : await getCredentialName(label, +userId)

      /* Get credential from the name */
      res.locals.credentials = await credentialService.getTwilioCredentials(
        credentialName
      )
      res.locals.credentialName = credentialName
      return next()
    } catch (err) {
      const errAsError = err as Error
      logger.error({
        ...logMeta,
        message: `${errAsError.stack}`,
      })
      return res.status(400).json({ message: `${errAsError.message}` })
    }
  }

  const getCredentialsFromLabelTransactional = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    const { label } = req.body
    const userId = req.session?.user?.id
    const logMeta = {
      label,
      action: 'getCredentialsFromLabelTransactional',
    }
    try {
      /* Determine if credential name can be used */
      const credentialName = await getCredentialName(label, +userId)

      /* Get credential from the name */
      res.locals.credentials = await credentialService.getTwilioCredentials(
        credentialName
      )
      res.locals.credentialName = credentialName
      return next()
    } catch (err) {
      const errAsError = err as Error
      logger.error({
        ...logMeta,
        message: `${errAsError.stack}`,
      })
      return res.status(400).json({ message: `${errAsError.message}` })
    }
  }

  /**
   * Sends a test message. If the test message succeeds,
   * store the credentials in AWS secrets manager and db.
   * Set the credentialName and channelType in res.locals to be passed downstream
   * @param req
   * @param res
   * @param next
   */
  const validateAndStoreCredentials = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { recipient } = req.body
    const { campaignId } = req.params
    const { credentials, credentialName } = res.locals
    const logMeta = {
      campaignId,
      recipient,
      action: 'validateAndStoreCredentials',
    }
    try {
      if (campaignId) {
        // Sends first hydrated message from campaign
        await SmsService.sendCampaignMessage(
          +campaignId,
          recipient,
          credentials
        )
      } else {
        // Sends generic validation message if campaignId not specified
        await SmsService.sendValidationMessage(recipient, credentials)
      }
      // If credentialName exists, credential has already been stored
      if (credentialName) {
        return next()
      }
    } catch (err) {
      logger.error({
        message: 'Failed to validate and store credentials',
        error: err,
        ...logMeta,
      })
      return res.status(400).json({ message: `${err}` })
    }
    try {
      // Store credentials in AWS secrets manager
      const stringifiedCredential = JSON.stringify(credentials)
      const credentialName = await SmsService.getEncodedHash(
        stringifiedCredential
      )

      // We only want to tag Twilio credentials with the environment tag in SecretsManager
      // when env is development. This allows us to quickly identify and clean up dev secrets.
      await credentialService.storeCredential(
        credentialName,
        stringifiedCredential,
        config.get('env') === 'development'
      )
      // Pass on to next middleware/handler
      res.locals.credentialName = credentialName
      res.locals.channelType = ChannelType.SMS
      next()
    } catch (err) {
      logger.error({
        message: 'Failed to store credentials in AWS secrets manager',
        error: err,
        ...logMeta,
      })
      return res.status(400).json({ message: `${(err as Error).message}` })
    }
  }

  /**
   * Associate campaign with a credential
   * @param req
   * @param res
   * @param next
   */
  const setCampaignCredential = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
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
  const getCampaignDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const { campaignId } = req.params
      const credentialName = getDemoCredentialName(DefaultCredentialName.SMS)
      const credentials = await credentialService.getTwilioCredentials(
        credentialName
      )
      const result = await SmsService.getCampaignDetails(
        +campaignId,
        credentials
      )
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
      return res.json({
        preview: await SmsService.getHydratedMessage(+campaignId),
      })
    } catch (err) {
      return next(err)
    }
  }

  /**
   *  Duplicate a campaign and its template
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
      const campaign = await SmsService.duplicateCampaign({
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

  /**
   * Determine if new credentials can be validated based on whether fallback is activated.
   * @param _req
   * @param res
   * @param next
   */
  const canValidateCredentials = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    if (config.get('smsFallback.activate')) {
      return res.status(400).json({
        message:
          'We are temporarily unable to validate Twilio credentials. Please try again later.',
      })
    }
    next()
  }

  return {
    getCredentialsFromBody,
    getCredentialsFromLabelCampaign,
    getCredentialsFromLabelTransactional,
    isSmsCampaignOwnedByUser,
    validateAndStoreCredentials,
    setCampaignCredential,
    getCampaignDetails,
    previewFirstMessage,
    disabledForDemoCampaign,
    duplicateCampaign,
    canValidateCredentials,
  }
}
