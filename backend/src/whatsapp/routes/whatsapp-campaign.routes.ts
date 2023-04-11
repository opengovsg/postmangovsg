import { Router } from 'express'
import { WhatsappMiddleware } from '../middlewares'

export const InitWhatsappCampaignRoute = (
  whatsappMiddleware: WhatsappMiddleware
): Router => {
  const router = Router({ mergeParams: true })

  router.get('/', whatsappMiddleware.getCampaignDetails)
  return router
}
