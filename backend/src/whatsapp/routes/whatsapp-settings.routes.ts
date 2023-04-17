import { WhatsappMiddleware } from '@whatsapp/middlewares'
import { Router } from 'express'

export const InitWhatsappSettingsRoute = (
  whatsappMiddleware: WhatsappMiddleware
): Router => {
  const router = Router()
  router.get('/credentials', whatsappMiddleware.getCredentials)
  router.get('/template', whatsappMiddleware.getTemplates)
  return router
}
