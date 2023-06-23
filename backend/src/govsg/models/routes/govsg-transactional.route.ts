import { Joi, Segments, celebrate } from 'celebrate'
import { Router } from 'express'
import { GovsgTransactionalMiddleware } from '../middlewares/govsg-transactional.middleware'

export const InitGovsgMessageTransactionalRoute = (
  govsgTransactionalMiddleware: GovsgTransactionalMiddleware
): Router => {
  const router = Router({ mergeParams: true })
  const sendValidator = {
    // todo later
    [Segments.BODY]: Joi.object({
      recipient: Joi.string().required(),
      whatsapp_template_label: Joi.string().required(),
      params: Joi.object().required(),
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
