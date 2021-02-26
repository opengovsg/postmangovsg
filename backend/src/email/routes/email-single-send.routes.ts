import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { EmailSingleSendMiddleware } from '@email/middlewares'
import { fromAddressValidator } from '@core/utils/from-address'

const router = Router({ mergeParams: true })

// Validators
const sendEmailValidator = {
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
 * path:
 *   /single/email/send:
 *     post:
 *       summary: "Send a single email"
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
 *       responses:
 *         "202":
 *           description: Accepted. The message is being sent.
 *         "400":
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "429":
 *           description: Too many requests. Please try again later.
 *         "500":
 *           description: Internal Server Error
 */
router.use(
  '/send',
  celebrate(sendEmailValidator),
  EmailSingleSendMiddleware.sendMessage
)

export default router
