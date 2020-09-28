import { Router } from 'express'
import validator from 'validator'

import { EmailMiddleware } from '@email/middlewares'

import { celebrate, Joi, Segments } from 'celebrate'
import config from '@core/config'

const router = Router()

// validators
const verifyValidator = {
  [Segments.BODY]: Joi.object({
    recipient: Joi.string()
      .email()
      .options({ convert: true })
      .lowercase()
      .optional(),
    from: Joi.string()
      .trim()
      .required()
      .default(config.get('mailFrom'))
      .custom((value: string, helpers) => {
        if (validator.isEmail(value, { allow_display_name: true })) {
          if (!/[<>]/.test(value)) return value.toLowerCase() // If the email does not contain display name, convert to lowercase
          return value // return the email with display name as is
        }
        return helpers.error('string.email')
      }),
  }),
}

/**
 * @swagger
 * path:
 *  /settings/email/from/verify:
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
  '/from/verify',
  celebrate(verifyValidator),
  EmailMiddleware.isFromAddressAccepted,
  EmailMiddleware.verifyFromAddress,
  EmailMiddleware.sendValidationMessage,
  EmailMiddleware.storeFromAddress
)

/**
 * @swagger
 * path:
 *  /settings/email/from:
 *    get:
 *      summary: Returns an array of valid custom 'from' email addresses for the user
 *      tags:
 *        - Settings
 *
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  from:
 *                    type: array
 *                    items:
 *                      type: string
 *        500:
 *          description: Internal Server Error
 *
 */
router.get('/from', EmailMiddleware.getCustomFromAddress)

export default router
