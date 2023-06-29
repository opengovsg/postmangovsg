import { GovsgCallbackMiddleware } from '@govsg/middlewares/govsg-callback.middleware'
import { Router } from 'express'

const router = Router()

/**
 * paths:
 *  /callback/govsg:
 *    post:
 *      summary: Update status of Govsg message
 *    tags:
 *      - Callback
 *    responses:
 *      200:
 *       description: OK
 *      400:
 *       description: Bad Request
 */
router.post(
  '/',
  GovsgCallbackMiddleware.isAuthenticated,
  GovsgCallbackMiddleware.parseEvent
)
export default router
