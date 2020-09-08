import { Request, Response } from 'express'
import { Router } from 'express'
import axios from 'axios'
import querystring from 'querystring'
import config from '@core/config'
import logger from '@core/logger'
const router = Router()

/**
 * @swagger
 * path:
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
  (req: Request, res: Response) => {
    if (!req.headers.authorization) {
      return res
        .header('WWW-Authenticate', 'Basic realm="Sms callback"')
        .sendStatus(401)
    }
    const { campaignId, messageId } = req.params
    const redirectTo = `https://callback.postman.gov.sg/${config.get(
      'env'
    )}/v1/campaign/${campaignId}/message/${messageId}`
    return axios
      .post(redirectTo, querystring.stringify(req.body), {
        headers: { Authorization: req.headers.authorization },
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
  }
)

export default router
