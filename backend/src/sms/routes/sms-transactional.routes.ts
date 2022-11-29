import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { SmsMiddleware, SmsTransactionalMiddleware } from '@sms/middlewares'

export const InitSmsTransactionalRoute = (
  smsMiddleware: SmsMiddleware
): Router => {
  const router = Router({ mergeParams: true })

  // Validators
  const sendValidator = {
    [Segments.BODY]: {
      body: Joi.string().required(),
      recipient: Joi.string().trim().required(),
      label: Joi.string().required(),
    },
  }

  // Routes

  /**
   * @swagger
   * paths:
   *   /transactional/sms/send:
   *     post:
   *       security:
   *         - bearerAuth: []
   *       summary: "Send a transactional SMS"
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
    celebrate(sendValidator),
    smsMiddleware.getCredentialsFromLabel,
    SmsTransactionalMiddleware.sendMessage
  )

  return router
}
