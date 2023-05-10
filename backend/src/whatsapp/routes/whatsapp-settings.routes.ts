import { WhatsappMiddleware } from '@whatsapp/middlewares'
import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

export const InitWhatsappSettingsRoute = (
  whatsappMiddleware: WhatsappMiddleware
): Router => {
  const router = Router()

  // validators
  const credentialValidator = {
    [Segments.BODY]: Joi.object({
      label: Joi.string().required(),
    }),
  }
  router.get('/credentials', whatsappMiddleware.getCredentials)
  router.post(
    '/templates',
    celebrate(credentialValidator),
    whatsappMiddleware.getTemplates
  )
  router.post(
    '/phone-numbers',
    celebrate(credentialValidator),
    whatsappMiddleware.getPhoneNumbers
  )
  return router
}
