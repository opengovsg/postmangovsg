import { Router } from 'express'
import { WhatsappCallbackMiddleware } from '@whatsapp/middlewares'

const router = Router()

/**
 * paths:
 * /callback/whatsapp:
 *   get:
 *     summary: Endpoint to verify endpoint ownership to WhatsApp
 *   post:
 *     summary: Update status of WhatsApp message
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Bad Request
 */

router.get('/', WhatsappCallbackMiddleware.verifyWebhookChallenge)

router.post(
  '/',
  WhatsappCallbackMiddleware.isAuthenticated,
  WhatsappCallbackMiddleware.parseEvent
)

export default router
