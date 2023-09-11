import { Request, Response, NextFunction, Handler } from 'express'
import { ChannelType, DefaultCredentialName } from '@core/constants'
import { CredentialService } from '@core/services'
import { TelegramService } from '@telegram/services'
import { loggerWithLabel } from '@core/logger'
import { formatDefaultCredentialName } from '@core/utils'
import {
  ApiAuthorizationError,
  ApiInvalidCredentialLabelError,
  ApiInvalidCredentialsError,
  ApiInvalidTemplateError,
  ApiNotFoundError,
} from '@core/errors/rest-api.errors'

export interface TelegramMiddleware {
  getCredentialsFromBody: Handler
  getCredentialsFromLabel: Handler
  getCampaignCredential: Handler
  isTelegramCampaignOwnedByUser: Handler
  getCampaignDetails: Handler
  previewFirstMessage: Handler
  validateAndStoreCredentials: Handler
  validateCredentials: Handler
  setCampaignCredential: Handler
  sendValidationMessage: Handler
  disabledForDemoCampaign: Handler
  duplicateCampaign: Handler
}

export const InitTelegramMiddleware = (
  credentialService: CredentialService
): TelegramMiddleware => {
  const logger = loggerWithLabel(module)

  const botId = (telegramBotToken: string): string =>
    telegramBotToken.split(':')[0]

  /**
   * Disable a request made for a demo campaign
   * @param req
   * @param res
   * @param next
   */
  const disabledForDemoCampaign = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.session?.user?.id
    const campaign = await TelegramService.findCampaign(
      +req.params.campaignId,
      userId
    )
    if (campaign.demoMessageLimit) {
      throw new ApiAuthorizationError('Action not allowed for demo campaign')
    }
    return next()
  }
  /**
   * Parse telegram credentials from request body, setting it to res.locals.credentials to be passed downstream
   * @param req
   * @param res
   * @param next
   */
  const getCredentialsFromBody = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    const { telegram_bot_token: telegramBotToken } = req.body

    res.locals.credentials = { telegramBotToken }
    res.locals.credentialName = `${process.env.APP_ENV}-${botId(
      telegramBotToken
    )}`
    return next()
  }

  const getDemoCredentialName = (label: string): string => {
    // Demo campaigns can only use default credentials
    if (label === DefaultCredentialName.Telegram) {
      return formatDefaultCredentialName(label)
    } else {
      throw new ApiAuthorizationError(
        `Demo campaign must use demo credentials. ${label} is not allowed.`
      )
    }
  }
  const getCredentialName = async (
    label: string,
    userId: number
  ): Promise<string> => {
    // Non-demo campaigns cannot use default credentials
    if (label === DefaultCredentialName.Telegram) {
      throw new ApiAuthorizationError(
        `Campaign cannot use demo credentials. ${label} is not allowed.`
      )
    } else {
      // if label provided, fetch from aws secrets
      const userCred = await credentialService.getUserCredential(userId, label)

      if (!userCred) {
        throw new Error('User credential cannot be found')
      }

      return userCred.credName
    }
  }

  /**
   * Parse label from request body. Retrieve credentials associated with this label,
   * and set the credentials to res.locals.credentials to be passed downstream
   * @param req
   * @param res
   * @param next
   */
  const getCredentialsFromLabel = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { campaignId } = req.params // May be undefined if invoked from settings page
    const { label } = req.body
    const userId = req.session?.user?.id
    const logMeta = {
      campaignId,
      label,
      action: 'getCredentialsFromLabel',
    }

    /* Determine if credential name can be used */
    const campaign = campaignId
      ? await TelegramService.findCampaign(+campaignId, userId)
      : null
    const credentialName = campaign?.demoMessageLimit
      ? getDemoCredentialName(label)
      : await getCredentialName(label, +userId)

    try {
      const telegramBotToken = await credentialService.getTelegramCredential(
        credentialName
      )
      res.locals.credentials = { telegramBotToken }
      res.locals.credentialName = botId(telegramBotToken)
      return next()
    } catch (err) {
      const errAsError = err as Error
      logger.error({
        ...logMeta,
        message: `${errAsError.stack}`,
      })
      throw new ApiInvalidCredentialLabelError(errAsError.message)
    }
  }

  /**
   * Retrieve credential for campaign
   * @param res
   * @param req
   * @param next
   */
  const getCampaignCredential = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { campaignId } = req.params
    const userId = req.session?.user?.id
    const campaign = await TelegramService.findCampaign(+campaignId, userId)

    const { credName } = campaign
    if (!credName) {
      logger.error({
        message: 'Credential not found for this campaign',
        campaignId,
        credName,
        action: 'getCampaignCredential',
      })
      throw new ApiNotFoundError('No credentials found for this campaign.')
    }

    const telegramBotToken = await credentialService.getTelegramCredential(
      credName
    )

    res.locals.credentials = { telegramBotToken }
    res.locals.credentialName = botId(telegramBotToken)
    next()
  }

  const validateCredentials = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { telegramBotToken } = res.locals.credentials
    const { credentialName } = res.locals
    const logMeta = {
      credentialName,
      action: 'validateCredentials',
    }
    try {
      await TelegramService.validateAndConfigureBot(telegramBotToken)
    } catch (err) {
      logger.error({
        message: 'Failed to validate and store credentials',
        error: err,
        ...logMeta,
      })
      throw new ApiInvalidCredentialsError((err as Error).message)
    }

    // Pass on to next middleware/handler
    res.locals.channelType = ChannelType.Telegram
    next()
  }

  /**
   * Call Telegram API getMe to validate token. If the token is valid,
   * we will set the callback url and store the credentials in AWS
   * SecretsManager and db.
   * Set the credentialName and channelType in res.locals to be passed downstream
   * @param req
   * @param res
   */
  const validateAndStoreCredentials = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { telegramBotToken } = res.locals.credentials
    const { credentialName } = res.locals
    const logMeta = {
      credentialName,
      action: 'validateAndStoreCredentials',
    }
    try {
      await TelegramService.validateAndConfigureBot(telegramBotToken)
    } catch (err) {
      logger.error({
        message: 'Failed to validate and store credentials',
        error: err,
        ...logMeta,
      })
      throw new ApiInvalidCredentialsError((err as Error).message)
    }

    try {
      // Credential name will be raw botId. The botId will not be hashed as we
      // want to preserve the mapping between botId and token even in the event
      // of a change in salt for future token revocations/updates for the given
      // botId.

      await credentialService.storeCredential(
        credentialName,
        telegramBotToken,
        true
      )
    } catch (err) {
      logger.error({
        message: 'Failed to validate and store credentials',
        error: err,
        ...logMeta,
      })
      return res.status(400).json({ message: 'Error storing credentials' })
    }

    // Pass on to next middleware/handler
    res.locals.channelType = ChannelType.Telegram
    next()
  }

  /**
   * Send validation message to recipient
   * @param req
   * @param res
   */
  const sendValidationMessage = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { campaignId } = req.params
    const { recipient } = req.body
    const { credentials } = res.locals
    const { telegramBotToken } = credentials
    const logMeta = { campaignId, recipient, action: 'sendValidationMessage' }

    try {
      if (!campaignId) {
        await TelegramService.sendValidationMessage(recipient, telegramBotToken)
      } else {
        await TelegramService.sendCampaignMessage(
          +campaignId,
          recipient,
          telegramBotToken
        )
      }
      logger.info({ message: 'Sent validation message', ...logMeta })
      return res.json({ message: 'OK' })
    } catch (err) {
      logger.info({
        message: 'Failed to send validation message',
        error: err,
        ...logMeta,
      })
      throw new ApiInvalidTemplateError((err as Error).message)
    }
  }

  /**
   * Checks if the campaign id supplied is indeed a campaign of the 'TELEGRAM' type, and belongs to the user
   * @param req
   * @param res
   * @param next
   */
  const isTelegramCampaignOwnedByUser = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { campaignId } = req.params
    const userId = req.session?.user?.id
    const campaign = await TelegramService.findCampaign(+campaignId, userId)
    if (campaign) {
      return next()
    }

    throw new ApiAuthorizationError(
      "User doesn't have access to this campaign."
    )
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
      const result = await TelegramService.getCampaignDetails(+campaignId)
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
    res: Response
  ): Promise<Response> => {
    const { campaignId } = req.params
    return res.json({
      preview: await TelegramService.getHydratedMessage(+campaignId),
    })
  }

  /**
   * Associate campaign with a credential
   * @param req
   * @param res
   * @param next
   */
  const setCampaignCredential = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { campaignId } = req.params
    const { credentialName } = res.locals
    if (!credentialName) {
      throw new Error('Credential does not exist')
    }

    await TelegramService.setCampaignCredential(+campaignId, credentialName)
    return res.json({ message: 'OK' })
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
      const campaign = await TelegramService.duplicateCampaign({
        campaignId: +campaignId,
        name,
      })
      if (!campaign) {
        throw new ApiNotFoundError(
          `Cannot duplicate. Campaign ${campaignId} was not found`
        )
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

  return {
    getCredentialsFromBody,
    getCredentialsFromLabel,
    getCampaignCredential,
    isTelegramCampaignOwnedByUser,
    getCampaignDetails,
    previewFirstMessage,
    validateAndStoreCredentials,
    validateCredentials,
    setCampaignCredential,
    sendValidationMessage,
    disabledForDemoCampaign,
    duplicateCampaign,
  }
}
