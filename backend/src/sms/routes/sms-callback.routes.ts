import { Router } from 'express'
import { SmsCallbackMiddleware } from '@sms/middlewares'
const router = Router()

/**
 * paths:
 *  /callback/sms/{campaignId}/{messageId}:
 *    post:
 *      summary: Update status of sms message
 *      tags:
 *        - Settings
 *      parameters:
 *        - c: campaignId
 *          in: path
 *          type: integer
 *          required: true
 *        - m: messageId
 *          in: path
 *          type: string
 *          required: true
 *      responses:
 *        200:
 *          description: OK
 *        400:
 *          description: Bad Request
 */
router.post(
  '/:campaignId(\\d+)/:messageId(\\d+)',
  SmsCallbackMiddleware.isAuthenticated,
  SmsCallbackMiddleware.parseEvent
)

export default router
