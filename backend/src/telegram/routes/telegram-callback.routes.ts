import { Router } from 'express'
import { TelegramCallbackMiddleware } from '@telegram/middlewares'
const router = Router()

/**
 * paths:
 *  /callback/telegram/{botToken}:
 *    post:
 *      summary: Subscribe to telegram bot
 *      tags:
 *        - Callback
 *      parameters:
 *        - name: botToken
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *      responses:
 *        200:
 *          description: OK
 *        400:
 *          description: Bad Request
 */
router.post(
  '/:botToken',
  TelegramCallbackMiddleware.verifyBotIdRegistered,
  TelegramCallbackMiddleware.handleUpdate
)

export default router
