import { Router } from 'express'
import { WhatsappMiddleware } from '@whatsapp/middlewares'

export const InitWhatsappCampaignRoute = (
  whatsappMiddleware: WhatsappMiddleware
): Router => {
  const router = Router({ mergeParams: true })

  router.get('/', whatsappMiddleware.getCampaignDetails)

  router.post('/send', whatsappMiddleware.sendMessage)
  return router
}
