import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { SmsMiddleware, SmsTransactionalMiddleware } from '@sms/middlewares'

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

  // Routes

  router.post(
    '/send',
    celebrate(sendValidator),
    SmsTransactionalMiddleware.saveMessage,
    smsMiddleware.getCredentialsFromLabelTransactional,
    SmsTransactionalMiddleware.sendMessage
  )

  return router
}
