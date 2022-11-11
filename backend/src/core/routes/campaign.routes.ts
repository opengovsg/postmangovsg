import { Router } from 'express'
import {
  ChannelType,
  Status,
  CampaignSortField,
  Ordering,
} from '@shared/core/constants'
import { celebrate, Joi, Segments } from 'celebrate'
import { CampaignMiddleware } from '@core/middlewares'
const router = Router()

// validators
const listCampaignsValidator = {
  [Segments.QUERY]: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0),
    type: Joi.string().valid(...Object.values(ChannelType)),
    status: Joi.string().valid(...Object.values(Status)),
    name: Joi.string().max(255).trim(),
    sort_by: Joi.string().valid(...Object.values(CampaignSortField)),
    order_by: Joi.string().valid(...Object.values(Ordering)),
  }),
}

const createCampaignValidator = {
  [Segments.BODY]: Joi.object({
    type: Joi.string()
      .valid(...Object.values(ChannelType))
      .required(),
    name: Joi.string().max(255).trim().required(),
    protect: Joi.boolean().default(false),
    demo_message_limit: Joi.number().default(null).min(1).max(20),
  }),
}

const deleteCampaignValidator = {
  [Segments.PARAMS]: Joi.object({
    campaignId: Joi.number().required(),
  }),
}

const updateCampaignValidator = {
  [Segments.BODY]: Joi.object({
    name: Joi.string().max(255).trim(),
    should_save_list: Joi.boolean().allow(null),
  }),
}

// actual routes here

/**
 * @swagger
 * paths:
 *  /campaigns:
 *    get:
 *      security:
 *        - bearerAuth: []
 *      tags:
 *        - Campaigns
 *      summary: List all campaigns for user
 *      parameters:
 *        - in: query
 *          name: limit
 *          description: max number of campaigns returned
 *          required: false
 *          schema:
 *            type: integer
 *            minimum: 1
 *            maximum: 100
 *            default: 10
 *        - in: query
 *          name: offset
 *          description: offset to begin returning campaigns from
 *          required: false
 *          schema:
 *            type: integer
 *            minimum: 0
 *            default: 0
 *        - in: query
 *          name: type
 *          description: mode of campaigns to filter for
 *          required: false
 *          schema:
 *            type: string
 *            enum: [EMAIL, SMS, TELEGRAM]
 *        - in: query
 *          name: status
 *          description: status of campaigns to filter for
 *          required: false
 *          schema:
 *            type: string
 *            enum: [Draft, Sending, Sent]
 *        - in: query
 *          name: name
 *          description: name of campaigns to filter for
 *          required: false
 *          schema:
 *            type: string
 *        - in: query
 *          name: sort_by
 *          description: field used to sort campaigns
 *          required: false
 *          schema:
 *            type: string
 *            enum: [created_at, sent_at]
 *            default: created_at
 *        - in: query
 *          name: order_by
 *          description: order to sort campaigns by
 *          required: false
 *          schema:
 *            type: string
 *            enum: [ASC, DESC]
 *            default: DESC
 *      responses:
 *        "200":
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  campaigns:
 *                    type: array
 *                    items:
 *                      $ref: '#/components/schemas/CampaignMeta'
 *                  total_count:
 *                    type: integer
 *
 *        "401":
 *          description: Unauthorized
 *        "403":
 *          description: Forbidden. Request violates firewall rules.
 *        "429":
 *          description: Rate limit exceeded. Too many requests.
 *          content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorStatus'
 *               example:
 *                 {status: 429, message: Too many requests. Please try again later.}
 *        "500":
 *          description: Internal Server Error
 *          content:
 *             text/plain:
 *               type: string
 *               example: Internal Server Error
 *        "502":
 *          description: Bad Gateway
 *        "504":
 *          description: Gateway Timeout
 *        "503":
 *          description: Service Temporarily Unavailable
 *        "520":
 *          description: Web Server Returns An Unknown Error
 *        "521":
 *          description: Web Server Is Down
 *        "522":
 *          description: Connection Timed Out
 *        "523":
 *          description: Origin Is Unreachable
 *        "524":
 *          description: A Timeout occurred
 *        "525":
 *          description: SSL handshake failed
 *        "526":
 *          description: Invalid SSL certificate
 */
router.get(
  '/',
  celebrate(listCampaignsValidator),
  CampaignMiddleware.listCampaigns
)

/**
 * @swagger
 * paths:
 *  /campaigns:
 *    post:
 *      security:
 *        - bearerAuth: []
 *      summary: Create a new campaign
 *      tags:
 *        - Campaigns
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *                type:
 *                   $ref: '#/components/schemas/ChannelType'
 *              required:
 *                - name
 *                - type
 *
 *      responses:
 *        "201":
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/CampaignMeta'
 *        "401":
 *           description: Unauthorized
 *        "403":
 *          description: Forbidden. Request violates firewall rules.
 *        "429":
 *          description: Rate limit exceeded. Too many requests.
 *          content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorStatus'
 *               example:
 *                 {status: 429, message: Too many requests. Please try again later.}
 *        "500":
 *          description: Internal Server Error
 *          content:
 *             text/plain:
 *               type: string
 *               example: Internal Server Error
 *        "502":
 *          description: Bad Gateway
 *        "504":
 *          description: Gateway Timeout
 *        "503":
 *          description: Service Temporarily Unavailable
 *        "520":
 *          description: Web Server Returns An Unknown Error
 *        "521":
 *          description: Web Server Is Down
 *        "522":
 *          description: Connection Timed Out
 *        "523":
 *          description: Origin Is Unreachable
 *        "524":
 *          description: A Timeout occurred
 *        "525":
 *          description: SSL handshake failed
 *        "526":
 *          description: Invalid SSL certificate
 */
router.post(
  '/',
  celebrate(createCampaignValidator),
  CampaignMiddleware.createCampaign
)

/**
 * @swagger
 * paths:
 *  /campaigns/{campaignId}:
 *    delete:
 *      security:
 *        - bearerAuth: []
 *      tags:
 *        - Campaigns
 *      summary: Delete a campaign using its ID
 *      parameters:
 *        - in: path
 *          name: campaignId
 *          description: ID of the campaign
 *          required: true
 *          schema:
 *            type: integer
 *            minimum: 1
 *      responses:
 *        "200":
 *          description: Successfully deleted
 *          content:
 *            schema:
 *              type: object
 *        "401":
 *          description: Unauthorized
 *        "404":
 *          description: Campaign not found
 *        "403":
 *          description: Forbidden. Request violates firewall rules.
 *        "429":
 *          description: Rate limit exceeded. Too many requests.
 *          content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/ErrorStatus'
 *               example:
 *                 {status: 429, message: Too many requests. Please try again later.}
 *        "500":
 *          description: Internal Server Error
 *          content:
 *             text/plain:
 *               type: string
 *               example: Internal Server Error
 *        "502":
 *          description: Bad Gateway
 *        "504":
 *          description: Gateway Timeout
 *        "503":
 *          description: Service Temporarily Unavailable
 *        "520":
 *          description: Web Server Returns An Unknown Error
 *        "521":
 *          description: Web Server Is Down
 *        "522":
 *          description: Connection Timed Out
 *        "523":
 *          description: Origin Is Unreachable
 *        "524":
 *          description: A Timeout occurred
 *        "525":
 *          description: SSL handshake failed
 *        "526":
 *          description: Invalid SSL certificate
 */
router.delete(
  '/:campaignId',
  celebrate(deleteCampaignValidator),
  CampaignMiddleware.deleteCampaign
)

/**
 * @swagger
 * paths:
 *  /campaigns/{campaignId}:
 *   put:
 *    security:
 *      - bearerAuth: []
 *    summary: Rename campaign
 *    tags:
 *      - Campaigns
 *    parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              name:
 *                type: string
 *              should_save_list:
 *                type: boolean
 *    responses:
 *      "200":
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/CampaignMeta'
 *      "401":
 *        description: Unauthorized
 *      "404":
 *        description: Not found
 *      "403":
 *        description: Forbidden. Request violates firewall rules.
 *      "429":
 *        description: Rate limit exceeded. Too many requests.
 *        content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorStatus'
 *             example:
 *               {status: 429, message: Too many requests. Please try again later.}
 *      "500":
 *        description: Internal Server Error
 *        content:
 *           text/plain:
 *             type: string
 *             example: Internal Server Error
 *      "502":
 *        description: Bad Gateway
 *      "504":
 *        description: Gateway Timeout
 *      "503":
 *        description: Service Temporarily Unavailable
 *      "520":
 *        description: Web Server Returns An Unknown Error
 *      "521":
 *        description: Web Server Is Down
 *      "522":
 *        description: Connection Timed Out
 *      "523":
 *        description: Origin Is Unreachable
 *      "524":
 *        description: A Timeout occurred
 *      "525":
 *        description: SSL handshake failed
 *      "526":
 *        description: Invalid SSL certificate
 */
router.put(
  '/:campaignId',
  celebrate(updateCampaignValidator),
  CampaignMiddleware.updateCampaign
)

export default router
