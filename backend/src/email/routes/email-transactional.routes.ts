import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  EmailTransactionalMiddleware,
  EmailMiddleware,
} from '@email/middlewares'
import { fromAddressValidator } from '@core/utils/from-address'
import { FileAttachmentMiddleware } from '@core/middlewares'
import { TransactionalEmailMessageStatus } from '@shared/core/models/email'
import { TransactionalEmailSortField } from '@shared/core/constants'

export const InitEmailTransactionalRoute = (
  emailTransactionalMiddleware: EmailTransactionalMiddleware,
  emailMiddleware: EmailMiddleware
): Router => {
  const router = Router({ mergeParams: true })

  // Validators
  const sendValidator = {
    [Segments.BODY]: Joi.object({
      recipient: Joi.string()
        .email()
        .options({ convert: true })
        .lowercase()
        .required(),
      subject: Joi.string().required(),
      body: Joi.string().required(),
      from: fromAddressValidator,
      reply_to: Joi.string()
        .trim()
        .email()
        .options({ convert: true })
        .lowercase(),
      attachments: Joi.array().items(Joi.object().keys().required()),
    }),
  }
  const getByIdValidator = {
    [Segments.PARAMS]: Joi.object({
      emailId: Joi.number().required(),
    }),
  }

  const listMessagesValidator = {
    [Segments.QUERY]: Joi.object({
      limit: Joi.number().integer().min(1).max(100).default(10),
      offset: Joi.number().integer().min(0).default(0),
      status: Joi.string()
        .uppercase()
        .valid(...Object.values(TransactionalEmailMessageStatus)),
      created_at: Joi.object({
        gt: Joi.date().iso(),
        gte: Joi.date().iso(),
        lt: Joi.date().iso(),
        lte: Joi.date().iso(),
      }),
      sort_by: Joi.string()
        .pattern(
          new RegExp(
            // accepts TransactionalEmailSortField values with optional +/- prefix
            `^[+-]?${Object.values(TransactionalEmailSortField).join('|')}$`
          )
        )
        .default(TransactionalEmailSortField.Created),
    }),
  }

  // Routes

  router.post(
    '/send',
    FileAttachmentMiddleware.fileUploadHandler,
    FileAttachmentMiddleware.preprocessPotentialIncomingFile,
    celebrate(sendValidator),
    emailTransactionalMiddleware.saveMessage,
    emailMiddleware.isFromAddressAccepted,
    emailTransactionalMiddleware.rateLimit,
    emailTransactionalMiddleware.sendMessage
  )

  router.get(
    '/',
    celebrate(listMessagesValidator),
    emailTransactionalMiddleware.listMessages
  )

  router.get(
    '/:emailId',
    celebrate(getByIdValidator),
    emailTransactionalMiddleware.getById
  )

  return router
}
