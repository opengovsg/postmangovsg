import { Router } from 'express'
import { ChannelType, Status, SortField, Ordering } from '@core/constants'
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
    sort_by: Joi.string().valid(...Object.values(SortField)),
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
    name: Joi.string().max(255).trim().required(),
  }),
}

// actual routes here

/**
 * @swagger
 * paths:
 *  /campaigns:
 *    get:
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
 *            enum: [name, created_at, sent_at]
 *        - in: query
 *          name: order_by
 *          description: order to sort campaigns by
 *          required: false
 *          schema:
 *            type: string
 *            enum: [ASC, DESC]
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
 *           description: Unauthorized
 *        "500":
 *           description: Internal Server Error
 */
router.get(
  '/',
  celebrate(listCampaignsValidator),
  CampaignMiddleware.listCampaigns
)

/**
 * @swagger
 * paths:
 *  /campaigns/{campaignId}:
 *    post:
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
 *                type: object
 *                properties:
 *                 id:
 *                  type: number
 *                 name:
 *                  type: string
 *                 created_at:
 *                  type: string
 *                  format: date-time
 *                 type:
 *                  $ref: '#/components/schemas/ChannelType'
 *        "401":
 *           description: Unauthorized
 *        "500":
 *           description: Internal Server Error
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
 *        "500":
 *          description: Internal Server Error
 */
router.delete(
  '/:campaignId',
  celebrate(deleteCampaignValidator),
  CampaignMiddleware.deleteCampaign
)

/**
 * paths:
 *  /campaigns/{campaignId}:
 *   put:
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
 *            required:
 *              - id
 *            properties:
 *              id:
 *                type: number
 *              name:
 *                type: string
 *    responses:
 *      "200":
 *        content:
 *          application/json:
 *            schema:
 *             type: object
 *      "401":
 *        description: Unauthorized
 *      "404":
 *        description: Not found
 *      "500":
 *        description: Internal Server Error
 */
router.put(
  '/:campaignId',
  celebrate(updateCampaignValidator),
  CampaignMiddleware.updateCampaign
)

export default router
