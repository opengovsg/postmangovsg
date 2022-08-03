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
   *                   type: string
   *                 from:
   *                   type: string
   *                 reply_to:
   *                   type: string
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
   *         "400":
   *           description: Bad Request. Message is malformed, or attachments are rejected.
   *         "401":
   *           description: Unauthorized
   *         "413":
   *           description: Number of attachments or size of attachments exceeded limit.
   *         "429":
   *           description: Too many requests. Please try again later.
   *         "500":
   *           description: Internal Server Error
   */
  router.use(
    '/send',
    FileAttachmentMiddleware.fileUploadHandler,
    FileAttachmentMiddleware.preprocessPotentialIncomingFile,
    celebrate(sendValidator),
    emailMiddleware.isFromAddressAccepted,
    emailTransactionalMiddleware.rateLimit,
    emailTransactionalMiddleware.sendMessage
  )

  return router
}
