import { loggerWithLabel } from '@core/logger'
import { Handler, Request, Response } from 'express'
import { CredentialService } from '@core/services'
import { WhatsappService } from '@whatsapp/services'

export interface WhatsappMiddleware {
  getCredentialsFromBody: Handler
  getCampaignDetails: Handler

  sendMessage: Handler
}

export const InitWhatsappMiddleware = (
  credentialService: CredentialService
): WhatsappMiddleware => {
  const logger = loggerWithLabel(module)
  const getCredentialsFromBody = async (
    req: Request,
    res: Response
  ): Promise<void | Response> => {
    logger.info(req, res, credentialService)
  }

  const getCampaignDetails = async (
    req: Request,
    res: Response
  ): Promise<void | Response> => {
    const { campaignId } = req.params
    return res.json({ campaignId })
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
  return {
    getCredentialsFromBody,
    getCampaignDetails,
    sendMessage,
  }
}
