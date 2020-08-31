import { Request, Response, NextFunction } from 'express'
import { Router } from 'express'
import logger from '@core/logger'
import { EmailCallbackMiddleware } from '@email/middlewares'
const router = Router()

const printConfirmSubscription = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const { Type: type, SubscribeURL: subscribeUrl } = req.body
  if (type === 'SubscriptionConfirmation') {
    const parsed = new URL(req.body['SubscribeURL'])
    if (
      parsed.protocol === 'https:' &&
      /^sns\.[a-zA-Z0-9-]{3,}\.amazonaws\.com(\.cn)?$/.test(parsed.host)
    ) {
      logger.info(
        `To confirm the subscription, enter this url: ${subscribeUrl}`
      )
      return res.sendStatus(202)
    }
  }
  return next()
}
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
  printConfirmSubscription,
  EmailCallbackMiddleware.isAuthenticated,
  EmailCallbackMiddleware.parseEvent
)

export default router
