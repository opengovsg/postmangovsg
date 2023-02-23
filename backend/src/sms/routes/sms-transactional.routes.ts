import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { SmsMiddleware, SmsTransactionalMiddleware } from '@sms/middlewares'
import { TransactionalSmsSortField } from '@core/constants'
import { TransactionalSmsMessageStatus } from '@sms/models'

export const InitSmsTransactionalRoute = (
  smsMiddleware: SmsMiddleware
): Router => {
  const router = Router({ mergeParams: true })

  // Validators
  const sendValidator = {
    [Segments.BODY]: {
      body: Joi.string().required(),
      recipient: Joi.string().trim().required(),
      label: Joi.string().required(),
    },
  }

  const listMessagesValidator = {
    [Segments.QUERY]: Joi.object({
      limit: Joi.number().integer().min(1).max(100).default(10),
      offset: Joi.number().integer().min(0).default(0),
      status: Joi.string()
        .uppercase()
        .valid(...Object.values(TransactionalSmsMessageStatus)),
      created_at: Joi.object({
        gt: Joi.date().iso(),
        gte: Joi.date().iso(),
        lt: Joi.date().iso(),
        lte: Joi.date().iso(),
      }),
      // shares the same sorting rules as transactional emails
      sort_by: Joi.string()
        .pattern(
          new RegExp(
            `^[+-]?${Object.values(TransactionalSmsSortField).join('|')}$`
          )
        )
        .default(TransactionalSmsSortField.Created),
    }),
  }

  const getByIdValidator = {
    [Segments.PARAMS]: Joi.object({
      smsId: Joi.number().required(),
    }),
  }

  // Routes

  router.post(
    '/send',
    celebrate(sendValidator),
    SmsTransactionalMiddleware.saveMessage,
    smsMiddleware.getCredentialsFromLabelTransactional,
    SmsTransactionalMiddleware.sendMessage
  )

  router.get(
    '/',
    celebrate(listMessagesValidator),
    SmsTransactionalMiddleware.listMessages
  )
  router.get(
    '/:smsId',
    celebrate(getByIdValidator),
    SmsTransactionalMiddleware.getById
  )

  return router
}
