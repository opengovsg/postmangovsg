import { UnsubscriberMiddleware } from '@core/middlewares'
import { celebrate, Joi, Segments } from 'celebrate'
import { Router } from 'express'

const router = Router()

const findOrCreateUnsubscribeValidator = {
  [Segments.PARAMS]: Joi.object({
    campaignId: Joi.number().integer().required(),
    recipient: Joi.string().required(),
  }),
  [Segments.BODY]: Joi.object({
    h: Joi.string().required(),
    v: Joi.string().required(),
    reason: Joi.string().required(),
  }),
}
const subscribeAgainValidator = {
  [Segments.PARAMS]: Joi.object({
    campaignId: Joi.number().integer().required(),
    recipient: Joi.string().required(),
  }),
}

/**
 * @swagger
 * paths:
 *  /unsubscribe/{campaignId}/{recipient}:
 *    put:
 *      summary: Add an unsubscriber
 *      tags:
 *        - Unsubscribe
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          type: integer
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
 *                reason:
 *                  type: string
 *                  description: unsubscribing reason
 *              required:
 *                - v
 *                - h
 *                - reason
 *
 *      responses:
 *        "200":
 *           description: OK (subscriber already exists, no update required)
 *        "201":
 *           description: Created (new subscriber added)
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

/**
 * @swagger
 * paths:
 *  /unsubscribe/{campaignId}/{recipient}:
 *    delete:
 *      summary: Add an unsubscriber
 *      tags:
 *        - Unsubscribe
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          type: integer
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
 *        "204":
 *           description: OK
 *        "400":
 *           description: Bad Request (invalid request, already unsubscribed)
 *        "500":
 *           description: Internal Server Error
 */
router.delete(
  '/:campaignId/:recipient',
  celebrate(subscribeAgainValidator),
  UnsubscriberMiddleware.isUnsubscribeRequestValid,
  UnsubscriberMiddleware.subscribeAgain
)

export default router
