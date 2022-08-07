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
   *       security:
   *         - bearerAuth: []
   *         - cookieAuth: []
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
   *           multipart/form-data:
   *             schema:
   *               type: object
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
   *                   type: string
   *                 from:
   *                   type: string
   *                 reply_to:
   *                   type: string
   *                   nullable: true
   *                 attachments:
   *                   type: array
   *                   nullable: true
   *                   items:
   *                     type: string
   *                     format: binary
   *       responses:
   *         "202":
   *           description: Accepted. The message is being sent.
   *           content:
   *              text/plain:
   *                type: string
   *                example: Accepted
   *         "400":
   *           description: Bad Request. Failed parameter validations, message is malformed, or attachments are rejected.
   *           content:
   *              text/plain:
   *                type: string
   *                examples:
   *                  InvalidRecipientError:
   *                    value: Recipient email is blacklisted
   *                  TemplateError:
   *                    value: Message is invalid as the subject or body only contains invalid HTML tags.
   *                  MaliciousFileError:
   *                    value: "Error: One or more attachments may be potentially malicious. Please check the attached files."
   *                  UnsupportedFileTypeError:
   *                    value: "Error: One or more attachments may be an unsupported file type. Please check the attached files."
   *              application/json:
   *                schema:
   *                  oneOf:
   *                    - $ref: '#/components/schemas/ValidationError'
   *                    - $ref: '#/components/schemas/Error'
   *                examples:
   *                  ValidationError:
   *                    value:
   *                        statusCode: 400
   *                        error: Bad Request
   *                        message: |-
   *                          "from" must be a valid email
   *                        validation: {source: body, keys: [from]}
   *                  FromError:
   *                    value: {message: Invalid 'from' email address.}
   *
   *         "401":
   *           description: Unauthorized.
   *           content:
   *              text/plain:
   *                type: string
   *                example: Unauthorized
   *         "403":
   *           description: Forbidden. Request violates firewall rules.
   *         "413":
   *           description: Number of attachments or size of attachments exceeded limit.
   *           content:
   *              application/json:
   *                schema:
   *                  $ref: '#/components/schemas/Error'
   *                examples:
   *                  AttachmentQtyLimit:
   *                    value: {message: Number of attachments exceeds limit}
   *                  AttachmentSizeLimit:
   *                    value: {message: Size of attachments exceeds limit}
   *         "429":
   *           description: Rate limit exceeded. Too many requests.
   *           content:
   *              application/json:
   *                schema:
   *                  $ref: '#/components/schemas/ErrorStatus'
   *                example:
   *                  {status: 429, message: Too many requests. Please try again later.}
   *         "500":
   *           description: Internal Server Error (includes error such as custom domain passed email validation but is incorrect)
   *           content:
   *              text/plain:
   *                type: string
   *                example: Internal Server Error
   *         "502":
   *           description: Bad Gateway
   *         "504":
   *           description: Gateway Timeout
   *         "503":
   *           description: Service Temporarily Unavailable
   *         "520":
   *           description: Web Server Returns An Unknown Error
   *         "521":
   *           description: Web Server Is Down
   *         "522":
   *           description: Connection Timed Out
   *         "523":
   *           description: Origin Is Unreachable
   *         "524":
   *           description: A Timeout occurred
   *         "525":
   *           description: SSL handshake failed
   *         "526":
   *           description: Invalid SSL certificate
   *
   * components:
   *  schemas:
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
   *    Error:
   *      type: object
   *      properties:
   *        message:
   *          type: string
   *
   *    ErrorStatus:
   *      type: object
   *      properties:
   *        status:
   *          type: integer
   *        message:
   *          type: string
   *
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
