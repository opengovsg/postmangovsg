import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { UnsubscriberMiddleware } from '@core/middlewares'

const router = Router()

const findOrCreateUnsubscribeValidator = {
  [Segments.PARAMS]: Joi.object({
    campaignId: Joi.number().integer().required(),
    recipient: Joi.string().required(),
  }),
  [Segments.BODY]: Joi.object({
    h: Joi.string().required(),
    v: Joi.string().required(),
  }),
}

/**
 * @swagger
 * path:
 *  /unsubscribe/{campaignId}/{recipient}:
 *    put:
 *      summary: Add a new unsubscriber
 *      tags:
 *        - Unsubscribe
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          type: string
 *          required: true
 *        - name: recipient
 *          in: path
 *          type: string
 *          required: true
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                v:
 *                  type: string
 *                  description: HMAC version
 *                h:
 *                  type: string
 *                  description: unsubscribe hash
 *              required:
 *                - v
 *                - h
 *
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  campaignId:
 *                    type: integer
 *                  recipient:
 *                    type: string
 *        "201":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  campaignId:
 *                    type: integer
 *                  recipient:
 *                    type: string
 *        "400":
 *           description: Bad Request (invalid request, already unsubscribed)
 *        "500":
 *           description: Internal Server Error
 */
router.put(
  '/:campaignId/:recipient',
  celebrate(findOrCreateUnsubscribeValidator),
  UnsubscriberMiddleware.isUnsubscribeRequestValid,
  UnsubscriberMiddleware.findOrCreateUnsubscriber
)

export default router
