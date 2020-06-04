import { Router } from 'express'
import { TelegramMiddleware } from '@telegram/middlewares'

const router = Router({ mergeParams: true })

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

export default router
