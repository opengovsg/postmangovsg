import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  EmailTransactionalMiddleware,
  EmailMiddleware,
} from '@email/middlewares'
import { fromAddressValidator } from '@core/utils/from-address'
import { FileAttachmentMiddleware } from '@core/middlewares'

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

  // Routes

  /**
   * @swagger
   * paths:
   *   /transactional/email/send:
   *     post:
   *       security:
   *         - bearerAuth: []
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
   *         "201":
   *           description: Accepted. The message is being sent.
   *           content:
   *              application/json:
   *                schema:
   *                  $ref: '#/components/schemas/EmailMessageTransactional'
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
    FileAttachmentMiddleware.fileUploadHandler,
    FileAttachmentMiddleware.preprocessPotentialIncomingFile,
    celebrate(sendValidator),
    emailTransactionalMiddleware.saveMessage,
    emailMiddleware.isFromAddressAccepted,
    emailTransactionalMiddleware.rateLimit,
    emailTransactionalMiddleware.sendMessage
  )

  /**
   * @swagger
   * paths:
   *   /transactional/email:
   *     get:
   *       security:
   *         - bearerAuth: []
   *         - cookieAuth: []
   *       tags:
   *         - Email
   *       summary: "List transactional emails"
   *       parameters:
   *         - in: query
   *           name: limit
   *           description: max number of messages returned
   *           required: false
   *           schema:
   *             type: integer
   *             minimum: 1
   *             maximum: 100
   *             default: 10
   *         - in: query
   *           name: offset
   *           description: offset to begin returning messages from
   *           required: false
   *           schema:
   *             type: integer
   *             minimum: 0
   *             default: 0
   *         - in: query
   *           name: status
   *           description: status of messages to filter for
   *           required: false
   *           schema:
   *             type: array
   *             items:
   *               type: string
   *               enum: [UNSENT, ACCEPTED, SENT, BOUNCED, DELIVERED, OPENED, COMPLAINT]
   *           style: form
   *           explode: true
   *         - in: query
   *           name: created_at
   *           description: >
   *              Filter for created_at timestamp of messages:
   *                - gt: greater than
   *                - gte: greater than or equal
   *                - lt: less than
   *                - lte: less than or equal
   *           required: false
   *           schema:
   *             type: object
   *             minProperties: 1
   *             properties:
   *               gt:
   *                 type: string
   *                 format: date-time
   *               gte:
   *                 type: string
   *                 format: date-time
   *               lt:
   *                 type: string
   *                 format: date-time
   *               lte:
   *                 type: string
   *                 format: date-time
   *         - in: query
   *           name: sort_by
   *           description: >
   *             Array of fields to sort by, default order is desc, but can be configured by adding a prefix of:
   *              - plus sign (+) for ascending order
   *              - minus sign (-) for descending order
   *           required: false
   *           schema:
   *             type: array
   *             default: [created_at]
   *             items:
   *               type: string
   *               enum: [created_at, +created_at, -created_at, updated_at, -updated_at, +updated_at]
   *
   *       responses:
   *         200:
   *           description: Succcessfully retrieve a list of messages
   *           content:
   *             application/json:
   *               schema:
   *                 type: object
   *                 required:
   *                   - has_more
   *                   - data
   *                 properties:
   *                   has_more:
   *                     type: boolean
   *                   data:
   *                     type: array
   *                     items:
   *                       $ref: '#/components/schemas/EmailMessageTransactional'
   *         "400":
   *           description: Bad Request. Failed parameter validations, message is malformed, or attachments are rejected.
   *           content:
   *             text/plain:
   *               type: string
   *         "401":
   *           description: Unauthorized.
   *           content:
   *             text/plain:
   *               type: string
   *               example: Unauthorized
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
   */

  /**
   * @swagger
   * paths:
   *   /transactional/email/{emailId}:
   *     get:
   *       security:
   *         - bearerAuth: []
   *         - cookieAuth: []
   *       tags:
   *         - Email
   *       summary: "Get transactional email by ID"
   *       parameters:
   *         - in: path
   *           name: emailId
   *           required: true
   *           schema:
   *             type: string
   *             example: 69
   *       responses:
   *         200:
   *           description: Succcessfully retrieve transactional email with corresponding ID
   *           content:
   *            application/json:
   *              schema:
   *                $ref: '#/components/schemas/EmailMessageTransactional'
   *         "400":
   *           description: Bad Request. Failed parameter validations, message is malformed, or attachments are rejected.
   *           content:
   *             text/plain:
   *               type: string
   *         "401":
   *           description: Unauthorized.
   *           content:
   *             text/plain:
   *               type: string
   *               example: Unauthorized
   *         "403":
   *           description: Forbidden. Request violates firewall rules.
   *         "404":
   *           description: Not Found. No transactional message with such ID found
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
   */
  router.get(
    '/:emailId',
    celebrate(getByIdValidator),
    emailTransactionalMiddleware.getById
  )

  return router
}
