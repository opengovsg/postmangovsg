import { Router } from 'express'
import { EmailCallbackMiddleware } from '@email/middlewares'
const router = Router()
/**
 * paths:
 *   /callback/email:
 *    post:
 *      summary: Update status of email message
 *      tags:
 *        - Callback
 *      responses:
 *        200:
 *          description: OK
 *        400:
 *          description: Bad Request
 */
router.post(
  '/',
  EmailCallbackMiddleware.printConfirmSubscription,
  EmailCallbackMiddleware.isAuthenticated,
  EmailCallbackMiddleware.parseEvent
)

export default router
