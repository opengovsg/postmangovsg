import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'

import { UnsubscriberMiddleware } from '@core/middlewares'

const router = Router()

const unsubscribeSchema = Joi.object({
  h: Joi.string().required(),
  c: Joi.number().integer().required(),
  r: Joi.string().required(),
  v: Joi.string().required(),
})
const getUnsubscribeStatusValidator = {
  [Segments.QUERY]: unsubscribeSchema,
}

const createUnsubscribeValidator = {
  [Segments.BODY]: unsubscribeSchema,
}

/**
 * @swagger
 * path:
 *  /unsubscribe:
 *    get:
 *      tags:
 *        - Unsubscribe
 *      summary: Get unsubscriber's status
 *      parameters:
 *        - in: query
 *          name: c
 *          description: campaign ID
 *          required: true
 *          schema:
 *            type: integer
 *        - in: query
 *          name: r
 *          description: recipient
 *          required: true
 *          schema:
 *            type: string
 *        - in: query
 *          name: v
 *          description: HMAC version
 *          required: true
 *          schema:
 *            type: string
 *        - in: query
 *          name: h
 *          description: HMAC
 *          required: true
 *          schema:
 *            type: string
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  unsubscribed:
 *                    type: boolean
 *                  campaign:
 *                    type: object
 *                    properties:
 *                      name:
 *                        type: string
 *                      type:
 *                        $ref: '#/components/schemas/ChannelType'
 *
 *        "400":
 *           description: Bad Request (invalid request, invalid campaign)
 *        "500":
 *           description: Internal Server Error
 */
router.get(
  '/',
  celebrate(getUnsubscribeStatusValidator),
  UnsubscriberMiddleware.isUnsubscribeRequestValid,
  UnsubscriberMiddleware.getUnsubscriberStatus
)

/**
 * @swagger
 * path:
 *  /unsubscribe:
 *    post:
 *      summary: Add a new unsubscriber
 *      tags:
 *        - Unsubscribe
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                c:
 *                  type: integer
 *                  description: campaign ID
 *                r:
 *                  type: string
 *                  description: recipient
 *                v:
 *                  type: string
 *                  description: HMAC version
 *                h:
 *                  type: string
 *                  description: HMAC
 *              required:
 *                - c
 *                - r
 *                - v
 *                - h
 *
 *      responses:
 *        "201":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  unsubscribed:
 *                    type: boolean
 *                  campaign:
 *                    type: object
 *                    properties:
 *                      name:
 *                        type: string
 *                      type:
 *                        $ref: '#/components/schemas/ChannelType'
 *        "400":
 *           description: Bad Request (invalid request, already unsubscribed)
 *        "500":
 *           description: Internal Server Error
 */
router.post(
  '/',
  celebrate(createUnsubscribeValidator),
  UnsubscriberMiddleware.isUnsubscribeRequestValid,
  UnsubscriberMiddleware.createUnsubscriber
)

export default router
