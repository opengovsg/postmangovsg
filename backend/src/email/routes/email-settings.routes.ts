import { fromAddressValidator } from '@core/utils/from-address'
import { EmailMiddleware } from '@email/middlewares'
import { celebrate, Joi, Segments } from 'celebrate'
import { Router } from 'express'

export const InitEmailSettingsRoute = (
  emailMiddleware: EmailMiddleware
): Router => {
  const router = Router()

  // validators
  const verifyValidator = {
    [Segments.BODY]: Joi.object({
      recipient: Joi.string()
        .email()
        .options({ convert: true })
        .lowercase()
        .optional(),
      from: fromAddressValidator,
    }),
  }

  /**
   * @swagger
   * paths:
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
   *                recipient:
   *                  type: string
   *                from:
   *                  type: string
   *
   *      responses:
   *        200:
   *          description: OK
   *        400:
   *          description: Bad Request (verification fails)
   *        503:
   *          description: Service Unavailable. Try using the default from address instead.
   *
   */
  router.post(
    '/from/verify',
    celebrate(verifyValidator),
    emailMiddleware.isCustomFromAddressAllowed,
    emailMiddleware.isFromAddressAccepted,
    emailMiddleware.verifyFromAddress,
    emailMiddleware.sendValidationMessage,
    emailMiddleware.storeFromAddress
  )

  /**
   * @swagger
   * paths:
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
  router.get('/from', emailMiddleware.getCustomFromAddress)

  return router
}
