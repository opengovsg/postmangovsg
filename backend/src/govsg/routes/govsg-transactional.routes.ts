import { Joi, Segments, celebrate } from 'celebrate'
import { Router } from 'express'
import { GovsgTransactionalMiddleware } from '../middlewares/govsg-transactional.middleware'
import { WhatsAppLanguages } from '@shared/clients/whatsapp-client.class/types'
import {
  GovsgMessageStatus,
  TransactionalGovsgSortField,
} from '@core/constants'

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

  router.get(
    '/',
    celebrate({
      [Segments.QUERY]: Joi.object({
        limit: Joi.number().integer().min(1).max(1000).default(10),
        offset: Joi.number().integer().min(0).default(0),
        status: Joi.string()
          .uppercase()
          .valid(...Object.values(GovsgMessageStatus)),
        created_at: Joi.object({
          gt: Joi.date().iso(),
          gte: Joi.date().iso(),
          lt: Joi.date().iso(),
          lte: Joi.date().iso(),
        }),
        sort_by: Joi.string()
          .pattern(
            new RegExp(
              // accepts TransactionalGovsgSortField values with optional +/- prefix
              `^[+-]?${Object.values(TransactionalGovsgSortField).join('|')}$`
            )
          )
          .default(TransactionalGovsgSortField.Created),
      }),
    }),
    govsgTransactionalMiddleware.listMessages
  )

  return router
}
