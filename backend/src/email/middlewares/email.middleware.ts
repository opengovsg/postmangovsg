import { Request, Response, NextFunction, Handler } from 'express'
import { EmailService, CustomDomainService } from '@email/services'
import { isDefaultFromAddress } from '@core/utils/from-address'
import { parseFromAddress } from '@shared/utils/from-address'
import { AuthService, UnsubscriberService } from '@core/services'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { ThemeClient } from '@shared/theme'
import { EmailMessageTransactional } from '@email/models'
import {
  ApiAuthorizationError,
  ApiInvalidCredentialsError,
  ApiInvalidFromAddressError,
  ApiNotFoundError,
} from '@core/errors/rest-api.errors'

export interface EmailMiddleware {
  isEmailCampaignOwnedByUser: Handler
  validateAndStoreCredentials: Handler
  getCampaignDetails: Handler
  previewFirstMessage: Handler
  verifyFromAddress: Handler
  storeFromAddress: Handler
  getCustomFromAddress: Handler
  existsFromAddress: Handler
  isCustomFromAddressAllowed: Handler
  isFromAddressAccepted: Handler
  sendValidationMessage: Handler
  duplicateCampaign: Handler
}

export const INVALID_FROM_ADDRESS_ERROR_MESSAGE =
  "Invalid 'from' email address, which must be either the default donotreply@mail.postman.gov.sg or the user's email (which requires setup with Postman team). Contact us to learn more."

export const UNVERIFIED_FROM_ADDRESS_ERROR_MESSAGE =
  'From Address has not been verified. Contact us to learn more.'

export const InitEmailMiddleware = (
  authService: AuthService
): EmailMiddleware => {
  const logger = loggerWithLabel(module)

  /**
   * Checks if the campaign id supplied is indeed a campaign of the 'Email' type, and belongs to the user
   * @param req
   * @param res
   * @param next
   */
  const isEmailCampaignOwnedByUser = async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { campaignId } = req.params
    const userId = req.session?.user?.id
    const campaign = await EmailService.findCampaign(+campaignId, +userId)
    if (campaign) {
      return next()
    }

    throw new ApiAuthorizationError(
      "User doesn't have access to this campaign."
    )
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
      // This should be 500 instead because we're using the default email creds
      // for all of our campaigns hence this failure is catastrophic, but we're
      // keeping it 400 here for consistency and backward compatibility. To
      // protect the downside, we have alerts on our email service providers
      throw new ApiInvalidCredentialsError((err as Error).message)
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
      const themedBody = await ThemeClient.generateThemedBody({
        body: result.email_templates?.body as string,
        agencyName: result.user?.domain?.agency?.name as string,
        agencyLogoURI: result.user?.domain?.agency?.logo_uri as string,
        unsubLink: '/unsubscribe/test',
        showMasthead: true,
      })
      return res.json({
        ...result,
        email_templates: {
          ...result.email_templates,
          themed_body: themedBody,
        },
      })
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

      const {
        body,
        subject,
        replyTo,
        from,
        agencyName,
        agencyLogoURI,
        showMasthead,
      } = message
      const themedBody = await ThemeClient.generateThemedBody({
        body,
        unsubLink: UnsubscriberService.generateTestUnsubLink(),
        agencyName,
        agencyLogoURI,
        showMasthead,
      })

      return res.json({
        preview: {
          body,
          subject,
          reply_to: replyTo,
          from,
          themed_body: themedBody,
        },
      })
    } catch (err) {
      return next(err)
    }
  }

  /**
   * Checks if the from address is custom and rejects it if necessary.
   */
  const isCustomFromAddressAllowed = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const { from } = req.body
    if (isDefaultFromAddress(from)) return next()

    // We don't allow custom from address for the SendGrid fallback
    // since they aren't DKIM-authenticated currently
    if (config.get('emailFallback.activate')) {
      res.status(503).json({
        message:
          'Unable to use a custom from address due to downtime. Please use the default from address instead.',
      })
      return
    }

    next()
  }

  /**
   * Checks that the from address is either the user's email or the default app email
   */
  const isFromAddressAccepted = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    // Since from addresses with display name are accepted, we need to extract just the email address
    const { from } = req.body
    const { fromName, fromAddress } = parseFromAddress(from)

    // Retrieve logged in user's email
    const userEmail =
      req.session?.user?.email ||
      (await authService.findUser(req.session?.user?.id))?.email

    // Get default mail address for comparison
    const { fromName: defaultFromName, fromAddress: defaultFromAddress } =
      parseFromAddress(config.get('mailFrom'))

    if (
      //  user enters an email that is neither their own nor donotreply@mail.postman.gov.sg
      fromAddress !== userEmail &&
      fromAddress !== defaultFromAddress
    ) {
      logger.error({
        message: INVALID_FROM_ADDRESS_ERROR_MESSAGE,
        from,
        userEmail,
        defaultFromName,
        defaultFromAddress,
        fromAddress,
        action: 'isFromAddressAccepted',
      })
      // db update is only required for transactional email
      if (req.body.emailMessageTransactionalId) {
        void EmailMessageTransactional.update(
          {
            errorCode: `Error 400: ${INVALID_FROM_ADDRESS_ERROR_MESSAGE}`,
          },
          {
            where: { id: req.body.emailMessageTransactionalId },
          }
        )
      }
      throw new ApiInvalidFromAddressError(INVALID_FROM_ADDRESS_ERROR_MESSAGE)
    }

    res.locals.fromName = fromName
    res.locals.fromAddress = fromAddress

    return next()
  }

  /**
   * Verifies that the 'from' address exists in the EmailFromAddress table
   * NOTE: Must be called AFTER isFromAddressAccepted, which sets the required res.locals.fromName and res.locals.fromAddress
   */
  const existsFromAddress = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { from } = req.body
    if (isDefaultFromAddress(from)) return next()
    const { fromName, fromAddress } = res.locals

    // can only reach here if user supplied own email
    // if user supplied a different email, error from isFromAddressAccepted will be thrown
    // therefore, can simply check whether own email is in the list of verified emails
    // this is not great as the function is impure and relies on the order of middleware...
    const exists = await CustomDomainService.existsFromAddress(fromAddress)
    if (!exists) {
      logger.error({
        message: UNVERIFIED_FROM_ADDRESS_ERROR_MESSAGE,
        from,
        defaultEmail: config.get('mailFrom'),
        fromName,
        fromAddress,
        action: 'existsFromAddress',
      })
      if (req.body.emailMessageTransactionalId) {
        void EmailMessageTransactional.update(
          {
            errorCode: `Error 400: ${UNVERIFIED_FROM_ADDRESS_ERROR_MESSAGE}`,
          },
          {
            where: { id: req.body.emailMessageTransactionalId },
          }
        )
      }
      throw new ApiInvalidFromAddressError(
        UNVERIFIED_FROM_ADDRESS_ERROR_MESSAGE
      )
    }

    return next()
  }

  /**
   * Verifies the user's email address to see if it can be used as custom 'from' address
   * - if it is the default donotreply@mail.postman.gov.sg, return immediately
   * - else, make network calls to AWS SES and the user's domain to verify DNS settings are set up properly.
   */
  const verifyFromAddress = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { from } = req.body
    if (isDefaultFromAddress(from)) return next()

    const { fromAddress } = res.locals
    try {
      await CustomDomainService.verifyFromAddress(fromAddress)
    } catch (err) {
      logger.error({
        message: "Failed to verify 'from' email address",
        from,
        defaultEmail: config.get('mailFrom'),
        fromAddress,
        error: err,
        action: 'verifyFromAddress',
      })
      throw new ApiInvalidFromAddressError((err as Error).message)
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
    const { fromName, fromAddress } = res.locals

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
    const email =
      req.session?.user?.email ||
      (await authService.findUser(req.session?.user?.id))?.email
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
    _res: Response,
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
      throw new ApiInvalidFromAddressError((err as Error).message)
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
    res: Response
  ): Promise<Response | void> => {
    const { campaignId } = req.params
    const { name } = req.body
    const campaign = await EmailService.duplicateCampaign({
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
  }

  return {
    isEmailCampaignOwnedByUser,
    validateAndStoreCredentials,
    getCampaignDetails,
    previewFirstMessage,
    verifyFromAddress,
    storeFromAddress,
    getCustomFromAddress,
    existsFromAddress,
    isCustomFromAddressAllowed,
    isFromAddressAccepted,
    sendValidationMessage,
    duplicateCampaign,
  }
}
