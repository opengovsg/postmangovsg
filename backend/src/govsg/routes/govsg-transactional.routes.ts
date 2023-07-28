import { Joi, Segments, celebrate } from 'celebrate'
import { Router } from 'express'
import { GovsgTransactionalMiddleware } from '../middlewares/govsg-transactional.middleware'
import { WhatsAppLanguages } from '@shared/clients/whatsapp-client.class/types'

export const InitGovsgMessageTransactionalRoute = (
  govsgTransactionalMiddleware: GovsgTransactionalMiddleware
): Router => {
  const router = Router({ mergeParams: true })

  router.post(
    '/send',
    celebrate({
      [Segments.BODY]: Joi.object({
        recipient: Joi.string().required(),
        template_id: Joi.number().required(),
        language_code: Joi.string()
          .valid(...Object.values(WhatsAppLanguages))
          .default(WhatsAppLanguages.english),
        params: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
      }),
    }),
    govsgTransactionalMiddleware.saveMessage,
    govsgTransactionalMiddleware.sendMessage
  )

  router.get(
    '/:messageId',
    celebrate({
      [Segments.PARAMS]: Joi.object({
        messageId: Joi.number().required(),
      }),
    }),
    govsgTransactionalMiddleware.getById
  )

  return router
}
