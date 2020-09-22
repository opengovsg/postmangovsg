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

/**
 * @swagger
 * path:
 *  /settings/email/verify:
 *    post:
 *      summary: Verifies the user's email address to see if it can be used to send out emails
 *      tags:
 *        - Settings
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                from:
 *                  type: string
 *
 *      responses:
 *        200:
 *          description: OK
 *        400:
 *          description: Bad Request (verification fails)
 *
 */
router.post(
  '/verify',
  celebrate(verifyEmailValidator),
  EmailMiddleware.verifyFromAddress,
  EmailMiddleware.storeFromAddress
)

export default router
