import { Router } from 'express'
import { EmailCallbackMiddleware } from '@email/middlewares'
import { jitter } from '@core/utils/request'
const router = Router()
/**
 * @swagger
 * path:
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
  jitter,
  EmailCallbackMiddleware.parseEvent
)

export default router
