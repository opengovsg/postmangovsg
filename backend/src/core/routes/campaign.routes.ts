import { Router } from 'express'
import { ChannelType } from '@core/constants'
import { celebrate, Joi, Segments } from 'celebrate'
import { CampaignMiddleware } from '@core/middlewares'
const router = Router()

// validators
const listCampaignsValidator = {
  [Segments.QUERY]: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0),
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

// actual routes here

/**
 * @swagger
 * path:
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
 * path:
 *  /campaigns:
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

export default router
