import { Request, Response } from 'express'
import { Router } from 'express'
import axios from 'axios'
import logger from '@core/logger'
import config from '@core/config'
const router = Router()

/**
 * @swagger
 * path:
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
router.post('/:botToken', (req: Request, res: Response) => {
  const { botToken } = req.params
  const redirectTo = `https://callback.postman.gov.sg/${config.get(
    'env'
  )}/v1/telegram/${botToken}`
  return axios
    .post(redirectTo, req.body)
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
