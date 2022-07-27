import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  EmailTransactionalMiddleware,
  EmailMiddleware,
} from '@email/middlewares'
import { fromAddressValidator } from '@core/utils/from-address'

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
    }),
  }

  // Routes

  /**
   * @swagger
   * paths:
   *   /transactional/email/send:
   *     post:
   *       summary: "Send a transactional email"
   *       tags:
   *         - Email
   *       requestBody:
   *         content:
   *           application/json:
   *             schema:
   *               required:
   *                 - subject
   *                 - body
   *                 - recipient
   *               properties:
   *                 subject:
   *                   type: string
   *                 body:
   *                   type: string
   *                 recipient:
   *                   type: email
   *                 from:
   *                   type: custom domain
   *                 reply_to:
   *                   type: email
   *                   nullable: true
   *       responses:
   *         "202":
   *           description: Accepted. The message is being sent.
   *           content:
   *              text/plain:
   *                type: string
   *                example: Accepted
   *         "400":
   *           description: Bad Request
   *           content:
   *              text/plain:
   *                type: string
   *                examples:
   *                  Blacklist:
   *                    value: Recipient email is blacklisted
   *                  InvalidMessage:
   *                    value: Message is invalid as the subject or body only contains invalid HTML tags.
   *              application/json:
   *                schema:
   *                  oneOf:
   *                    - $ref: '#/components/schemas/ValidationError'
   *                    - $ref: '#/components/schemas/FromError'
   *
   *         "401":
   *           description: Unauthorized.
   *           content:
   *              text/plain:
   *                type: string
   *                example: Unauthorized
   *         "429":
   *           description: Rate limit exceeded
   *           content:
   *              text/plain:
   *                type: string
   *                example: Too many requests, please try again later.
   *              application/json:
   *                schema:
   *                  $ref: '#/components/schemas/RateLimit'
   *         "500":
   *           description: Internal Server Error (Eg. custom domain passed email validation but is incorrect)
   *           content:
   *              text/plain:
   *                type: string
   *                example: Internal Server Error
   *
   * components:
   *  schemas:
   *    RateLimit:
   *      description: rate limit exceeded
   *      type: object
   *      properties:
   *        status:
   *          type: integer
   *          example: 429
   *        message:
   *          type: string
   *          example: Too many requests. Please try again later.
   *
   *    ValidationError:
   *      description: any one of the params failed validation
   *      type: object
   *      properties:
   *        statusCode:
   *          type: integer
   *          example: 400
   *        error:
   *          type: string
   *          example: Bad Request
   *        message:
   *          type: string
   *          example: |-
   *            "from" must be a valid email
   *        validation:
   *          type: object
   *          properties:
   *            source:
   *              type: string
   *              example: body
   *            keys:
   *              type: array
   *              items:
   *                type: string
   *                example: from
   *
   *    FromError:
   *      description: from address passed email validation but is neither the users email nor the default app email
   *      type: object
   *      properties:
   *        message:
   *          type: string
   *          example: Invalid 'from' email address.
   */
  router.use(
    '/send',
    celebrate(sendValidator),
    emailMiddleware.isFromAddressAccepted,
    emailTransactionalMiddleware.rateLimit,
    emailTransactionalMiddleware.sendMessage
  )

  return router
}
