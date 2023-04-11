import { loggerWithLabel } from '@core/logger'
import { Handler, Request, Response } from 'express'
import { CredentialService } from '@core/services'

export interface WhatsappMiddleware {
  getCredentialsFromBody: Handler
  getCampaignDetails: Handler
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
  return {
    getCredentialsFromBody,
    getCampaignDetails,
  }
}
