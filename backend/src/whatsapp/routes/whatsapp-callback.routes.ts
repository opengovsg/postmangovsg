import { Router } from 'express'
import { WhatsappCallbackMiddleware } from '@whatsapp/middlewares'

const router = Router()

/**
 * paths:
 * /callbacks/whatsapp:
 *  post:
 *   summary: Update status of WhatsApp message
 * responses:
 *   200:
 *     description: OK
 *   400:
 *     description: Bad Request
 *
 */
router.post('/', WhatsappCallbackMiddleware.testHandler)

export default router
