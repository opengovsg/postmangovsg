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
      // not sure whether it's possible to validate that params is a Record<string,string> using Joi
      params: Joi.object().optional(), // optional because templates might not have params
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
