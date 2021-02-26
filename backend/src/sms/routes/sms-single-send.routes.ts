import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { SmsMiddleware, SmsSingleSendMiddleware } from '@sms/middlewares'

const router = Router({ mergeParams: true })

// Validators
const sendSingleValidator = {
  [Segments.BODY]: {
    body: Joi.string().required(),
    recipient: Joi.string().trim().required(),
    label: Joi.string().required(),
  },
}

// Routes

/**
 * @swagger
 * path:
 *   /single/sms/send:
 *     post:
 *       summary: "Send a single SMS"
 *       tags:
 *         - SMS
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               required:
 *                 - body
 *                 - recipient
 *                 - label
 *               properties:
 *                 body:
 *                   type: string
 *                 recipient:
 *                   type: string
 *                 label:
 *                   type: string
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
router.post(
  '/send',
  celebrate(sendSingleValidator),
  SmsMiddleware.getCredentialsFromLabel,
  SmsSingleSendMiddleware.sendMessage
)

export default router
