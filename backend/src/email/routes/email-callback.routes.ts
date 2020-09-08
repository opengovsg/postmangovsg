import { Request, Response, NextFunction } from 'express'
import { Router } from 'express'
import axios from 'axios'
import config from '@core/config'
import logger from '@core/logger'
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
router.post('/', printConfirmSubscription, (req: Request, res: Response) => {
  if (!req.headers.authorization) {
    return res
      .header('WWW-Authenticate', 'Basic realm="Email callback"')
      .sendStatus(401)
  }
  const redirectTo = `https://callback.postman.gov.sg/${config.get(
    'env'
  )}/v1/email`
  // res.redirect(307, url.toString()) somehow strips the authorization header when redirected to api gateway.
  // Request cannot get past authorizer on api gateway, but works on localhost
  const headers = {
    Authorization: req.headers.authorization,
    'x-amz-sns-message-type': req.headers['x-amz-sns-message-type'],
  }
  return axios
    .post(redirectTo, req.body, {
      headers,
    })
    .then(() => res.sendStatus(200))
    .catch((err) => {
      if (err.response) {
        logger.error(
          `${err.response.status}: ${JSON.stringify(err.response.headers)}`
        )
        return res.sendStatus(err.response.status)
      } else {
        logger.error(err)
        return res.sendStatus(500)
      }
    })
})

export default router
