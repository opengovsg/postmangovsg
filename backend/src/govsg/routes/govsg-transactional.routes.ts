import { Joi, Segments, celebrate } from 'celebrate'
import { Router } from 'express'
import { GovsgTransactionalMiddleware } from '../middlewares/govsg-transactional.middleware'
import { WhatsAppLanguages } from '@shared/clients/whatsapp-client.class/types'

export const InitGovsgMessageTransactionalRoute = (
  govsgTransactionalMiddleware: GovsgTransactionalMiddleware
): Router => {
  const router = Router({ mergeParams: true })
  const sendValidator = {
    [Segments.BODY]: Joi.object({
      recipient: Joi.string().required(),
      template_id: Joi.number().required(),
      language_code: Joi.string()
        .valid(...Object.values(WhatsAppLanguages))
        .default(WhatsAppLanguages.english),
      params: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
    }),
  }

  router.post(
    '/send',
    celebrate(sendValidator),
    govsgTransactionalMiddleware.saveMessage,
    govsgTransactionalMiddleware.sendMessage
  )
  return router
}
