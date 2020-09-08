import { Request, Response } from 'express'
import { Router } from 'express'
import axios from 'axios'
import config from '@core/config'
import logger from '@core/logger'
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
router.post('/', (req: Request, res: Response) => {
  const redirectTo = `https://callback.postman.gov.sg/${config.get(
    'env'
  )}/v1/email`
  // return res.redirect(307, redirectTo)
  // res.redirect(307, url.toString()) somehow strips the authorization header when redirected to api gateway.
  // Request cannot get past authorizer on api gateway, but works on localhost
  return axios
    .post(redirectTo, req.body, {
      headers: { Authorization: req.headers.authorization || '' },
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
