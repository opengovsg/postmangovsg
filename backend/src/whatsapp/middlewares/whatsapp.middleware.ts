import { loggerWithLabel } from '@core/logger'
import { Handler, Request, Response } from 'express'
import { CredentialService, DomainService } from '@core/services'
import { WhatsappService } from '@whatsapp/services'

export interface WhatsappMiddleware {
  getCredentials: Handler
  getCampaignDetails: Handler
  getTemplates: Handler

  sendMessage: Handler
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

  const getCampaignDetails = async (
    req: Request,
    res: Response
  ): Promise<void | Response> => {
    const { campaignId } = req.params
    return res.json({ campaignId })
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
    }
    if (!credLabel) {
      logger.error({
        message: 'Empty credentials label in body',
        action: 'getTemplates',
      })
      res.sendStatus(400)
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
    }

    return res.json(domainCreds)
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
      return res.status(401).json({ message: e })
    }
  }
  return {
    getCampaignDetails,
    getCredentials,
    getTemplates,
    sendMessage,
  }
}
