import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { EmailMiddleware } from '@email/middlewares'

const router = Router()

// validators
const verifyEmailValidator = {
  [Segments.BODY]: Joi.object({
    from: Joi.string()
      .trim()
      .email()
      .options({ convert: true })
      .lowercase()
      .required(),
  }),
}

// SWTODO: Add swagger docs
router.post(
  '/verify',
  celebrate(verifyEmailValidator),
  EmailMiddleware.verifyFromEmailAddress,
  EmailMiddleware.storeVerifiedEmail
)

export default router
