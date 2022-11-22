import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { EmailMiddleware } from '@email/middlewares'
import { fromAddressValidator } from '@core/utils/from-address'

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
   * paths:
   *  /settings/email/from/verify:
   *    post:
   *      summary: Verifies a custom from email address
   *      description: >
   *        Verifies a custom from email address to see if it can be used to send out emails.
   *        This endpoint will:
   *          - Check if the custom email is the same as the account's email
   *          - Verify DKIM records of the custom domains to match required ones from AWS
   *          - Send a confirmation email to the `recipient` address from the custom address
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
   *                  description: >
   *                    The custom email address to verify. Accepted formats:
   *                      - email@custom-address.tld
   *                      - "Custom Name<email@custom-address.tld>"
   *                  type: string
   *                  example: "Example <example@postman.gov.sg>"
   *                recipient:
   *                  type: string
   *                  description: The email to receive success confirmation
   *                  example: example@example.com
   *
   *      responses:
   *        200:
   *          description: Successfully verify custom from email address
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                required:
   *                  - email
   *                properties:
   *                  email:
   *                    type: string
   *                    example: "Example <example@postman.gov.sg>"
   *        400:
   *          description: Bad Request (verification fails)
   *        "401":
   *          description: Unauthorized.
   *          content:
   *             text/plain:
   *               type: string
   *               example: Unauthorized
   *        "403":
   *          description: Forbidden. Request violates firewall rules.
   *        "429":
   *          description: Rate limit exceeded. Too many requests.
   *          content:
   *             application/json:
   *               schema:
   *                 $ref: '#/components/schemas/ErrorStatus'
   *               example:
   *                 {status: 429, message: Too many requests. Please try again later.}
   *        "500":
   *          description: Internal Server Error
   *          content:
   *             text/plain:
   *               type: string
   *               example: Internal Server Error
   *        "502":
   *          description: Bad Gateway
   *        "504":
   *          description: Gateway Timeout
   *        "503":
   *          description: Service Temporarily Unavailable
   *        "520":
   *          description: Web Server Returns An Unknown Error
   *        "521":
   *          description: Web Server Is Down
   *        "522":
   *          description: Connection Timed Out
   *        "523":
   *          description: Origin Is Unreachable
   *        "524":
   *          description: A Timeout occurred
   *        "525":
   *          description: SSL handshake failed
   *        "526":
   *          description: Invalid SSL certificate
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
