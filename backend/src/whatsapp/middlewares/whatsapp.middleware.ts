import { loggerWithLabel } from '@core/logger'
import { Handler, NextFunction, Request, Response } from 'express'
import { CredentialService, DomainService } from '@core/services'
import { WhatsappService } from '@whatsapp/services'

export interface WhatsappMiddleware {
  getCredentials: Handler
  getCredentialsFromLabelForCampaign: Handler
  getCampaignDetails: Handler
  getPhoneNumbers: Handler
  getTemplates: Handler
  isWhatsappCampaignOwnedByUser: Handler
  previewFirstMessage: Handler
  sendMessage: Handler
  validateAndStoreCredentials: Handler
  setCampaignCredentials: Handler
}

export const InitWhatsappMiddleware = (
  credentialService: CredentialService
): WhatsappMiddleware => {
  const logger = loggerWithLabel(module)
  const getCredentials = async (
    req: Request,
    res: Response
  ): Promise<void | Response> => {
    const userId = req.session?.user?.id
    const userDomain = await DomainService.getUserDomain(userId)
    // if empty or user not found
    if (!userDomain) {
      logger.error({
        message: 'User does not belong to a domain',
        action: 'getTemplates',
      })
      res.sendStatus(401)
    }
    const domainCredentialLabels =
      await credentialService.getAllCredentialsUnderDomain(userDomain)
    return res.json(domainCredentialLabels)
  }

  /**
   * Store local credentials first for this campaign
   * @param req
   * @param res
   * @param next
   */
  const getCredentialsFromLabelForCampaign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    const { campaignId } = req.params // May be undefined if invoked from settings page
    const { label } = req.body
    const userId = req.session?.user?.id
    const logMeta = {
      campaignId,
      userId,
      label,
      action: 'getCredentialsFromLabelForCampaign',
    }

    try {
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

  const getCampaignDetails = async (
    req: Request,
    res: Response
  ): Promise<void | Response> => {
    const { campaignId } = req.params
    return res.json({ campaignId })
  }

  /**
   * Given these credentials, retrieve the phone numbers from the selected credentials
   * @param req
   * @param res
   */
  const getPhoneNumbers = async (
    req: Request,
    res: Response
  ): Promise<void | Response> => {
    const userId = req.session?.user?.id
    const userDomain = await DomainService.getUserDomain(userId)
    const credLabel = req.body.label
    if (!userDomain) {
      logger.error({
        message: 'User does not belong to a domain',
        action: 'getTemplates',
      })
      res.sendStatus(401)
      return
    }
    if (!credLabel) {
      logger.error({
        message: 'Empty credentials label in body',
        action: 'getTemplates',
      })
      res.sendStatus(400)
      return
    }

    const domainCreds = await credentialService.getDomainCredential(
      userDomain,
      credLabel
    )
    if (!domainCreds) {
      logger.error({
        message: 'Credentials do not belong to this user',
        action: 'getTemplates',
      })
      res.sendStatus(401)
      return
    }

    // given the creds, retrieve list of possible numbers tied to this account, and it's display name.
    // Also to note, the 'from' is the phone number ID, not the phone number itself
    const phoneNumbers = await WhatsappService.getPhoneNumbers(
      domainCreds.credName
    )
    return res.json(phoneNumbers)
  }

  const getTemplates = async (
    req: Request,
    res: Response
  ): Promise<void | Response> => {
    const userId = req.session?.user?.id
    const userDomain = await DomainService.getUserDomain(userId)
    const credLabel = req.body.label
    if (!userDomain) {
      logger.error({
        message: 'User does not belong to a domain',
        action: 'getTemplates',
      })
      res.sendStatus(401)
      return
    }
    if (!credLabel) {
      logger.error({
        message: 'Empty credentials label in body',
        action: 'getTemplates',
      })
      res.sendStatus(400)
      return
    }

    const domainCreds = await credentialService.getDomainCredential(
      userDomain,
      credLabel
    )
    if (!domainCreds) {
      logger.error({
        message: 'Credentials do not belong to this user',
        action: 'getTemplates',
      })
      res.sendStatus(401)
      return
    }

    let resp
    try {
      resp = await WhatsappService.getTemplates(domainCreds.credName)
    } catch (e) {
      logger.error({
        message: e,
        action: 'getTemplates',
      })
      res.sendStatus(400)
    }
    return res.json(resp)
  }

  const previewFirstMessage = async (
    req: Request,
    res: Response
  ): Promise<Response | void> => {
    const { campaignId } = req.params
    const message = ''
    if (!message) return res.json({})

    return res.json({ campaignId })
  }

  const isWhatsappCampaignOwnedByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const { campaignId } = req.params
    const userId = req.session?.user?.id
    const campaign = await WhatsappService.findCampaign(+campaignId, +userId)
    if (campaign) {
      return next()
    } else {
      return res.sendStatus(403)
    }
  }

  const setCampaignCredentials = async (
    req: Request,
    res: Response
  ): Promise<Response | void> => {
    const { campaignId } = req.params
    const { credentialName } = res.locals
    if (!credentialName) {
      throw new Error('Credential does not exist')
    }
    await WhatsappService.setCampaignCredentials(+campaignId, credentialName)
    return res.json({ message: 'OK' })
  }
  const sendMessage = async (
    req: Request,
    res: Response
  ): Promise<void | Response> => {
    const { recipient, from, content } = req.body
    try {
      const resp = await WhatsappService.sendMessage(from, recipient, content)
      return res.json(resp)
    } catch (e) {
      logger.error({
        message: 'Something went wrong with sending a message',
        error: e,
      })
      res.sendStatus(500)
    }
  }

  const validateAndStoreCredentials = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    const { campaignId } = req.params
    const { recipient, template } = req.body
    const { credentials, credentialName } = res.locals
    const logMeta = {
      campaignId,
      recipient,
      template,
      credentials,
      credentialName,
      action: 'validateAndStoreCredentials',
    }
    logger.info({ ...logMeta })
    next()
  }
  return {
    getCampaignDetails,
    getCredentialsFromLabelForCampaign,
    getCredentials,
    getPhoneNumbers,
    getTemplates,
    previewFirstMessage,
    isWhatsappCampaignOwnedByUser,
    sendMessage,
    validateAndStoreCredentials,
    setCampaignCredentials,
  }
}
