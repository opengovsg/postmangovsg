import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { CampaignMiddleware } from '@core/middlewares'
import {
  TelegramMiddleware,
  TelegramTemplateMiddleware,
} from '@telegram/middlewares'

const router = Router({ mergeParams: true })

// Validators
const storeTemplateValidator = {
  [Segments.BODY]: Joi.object({
    body: Joi.string().required(),
  }),
}

// Routes

// Check if campaign belongs to user for this router
router.use(TelegramMiddleware.isTelegramCampaignOwnedByUser)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram:
 *    get:
 *      tags:
 *        - Telegram
 *      summary: Get telegram campaign details
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  campaign:
 *                    $ref: '#/components/schemas/TelegramCampaign'
 *                  num_recipients:
 *                    type: number
 *        "401":
 *           description: Unauthorized
 *        "403" :
 *           description: Forbidden, campaign not owned by user or job in progress
 *        "500":
 *           description: Internal Server Error
 */
router.get('/', TelegramMiddleware.getCampaignDetails)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/telegram/template:
 *     put:
 *       tags:
 *         - Telegram
 *       summary: Stores body template for telegram campaign
 *       parameters:
 *         - name: campaignId
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 body:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 200
 *
 *       responses:
 *         200:
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 required:
 *                   - message
 *                   - valid
 *                   - num_recipients
 *                   - template
 *                 properties:
 *                   message:
 *                     type: string
 *                   extra_keys:
 *                     type: array
 *                     items:
 *                       type: string
 *                   valid:
 *                     type: boolean
 *                   num_recipients:
 *                     type: integer
 *                   template:
 *                     type: object
 *                     properties:
 *                       body:
 *                         type: string
 *                       params:
 *                         type: array
 *                         items:
 *                           type: string
 *         "400":
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "403":
 *           description: Forbidden, campaign not owned by user or job in progress
 *         "500":
 *           description: Internal Server Error
 */
router.put(
  '/template',
  celebrate(storeTemplateValidator),
  CampaignMiddleware.canEditCampaign,
  TelegramTemplateMiddleware.storeTemplate
)

export default router
