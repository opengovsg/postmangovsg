import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { CampaignMiddleware, TemplateMiddleware } from '@core/middlewares'
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

const uploadStartValidator = {
  [Segments.QUERY]: Joi.object({
    mime_type: Joi.string().required(),
  }),
}

const uploadCompleteValidator = {
  [Segments.BODY]: Joi.object({
    transaction_id: Joi.string().required(),
    filename: Joi.string().required(),
  }),
}
const storeCredentialsValidator = {
  [Segments.BODY]: Joi.object({
    telegram_bot_token: Joi.string().trim().required(),
  }),
}

const useCredentialsValidator = {
  [Segments.BODY]: Joi.object({
    label: Joi.string().required(),
  }),
}

const verifyCredentialsValidator = {
  [Segments.BODY]: Joi.object({
    recipient: Joi.string().trim().required(),
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

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/telegram/upload/start:
 *     get:
 *       description: "Get a presigned URL for upload"
 *       tags:
 *         - Telegram
 *       parameters:
 *         - name: campaignId
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *         - name: mime_type
 *           in: query
 *           required: true
 *           schema:
 *             type: string
 *       responses:
 *         200:
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   presigned_url:
 *                     type: string
 *                   transaction_id:
 *                     type: string
 *         "400":
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "403":
 *           description: Forbidden, campaign not owned by user or job in progress
 *         "500":
 *           description: Internal Server Error
 */
router.get(
  '/upload/start',
  celebrate(uploadStartValidator),
  CampaignMiddleware.canEditCampaign,
  TemplateMiddleware.uploadStartHandler
)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/telegram/upload/complete:
 *     post:
 *       description: "Complete upload session"
 *       tags:
 *         - Telegram
 *       parameters:
 *         - name: campaignId
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               required:
 *                 - transaction_id
 *                 - filename
 *               properties:
 *                 transaction_id:
 *                   type: string
 *                 filename:
 *                   type: string
 *       responses:
 *         200:
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 properties:
 *                   num_recipients:
 *                     type: number
 *                   preview:
 *                     type: object
 *                     properties:
 *                       body:
 *                         type: string
 *
 *         "400" :
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "403":
 *          description: Forbidden, campaign not owned by user or job in progress
 *         "500":
 *           description: Internal Server Error
 */
router.post(
  '/upload/complete',
  celebrate(uploadCompleteValidator),
  CampaignMiddleware.canEditCampaign,
  TelegramTemplateMiddleware.uploadCompleteHandler
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/preview:
 *    get:
 *      tags:
 *        - Telegram
 *      summary: Preview templated message
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
 *                  preview:
 *                    type: object
 *                    properties:
 *                      body:
 *                        type: string
 *        "401":
 *           description: Unauthorized
 *        "500":
 *           description: Internal Server Error
 */
router.get('/preview', TelegramMiddleware.previewFirstMessage)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/new-credentials:
 *    post:
 *      tags:
 *        - Telegram
 *      summary: Validate Telegram bot token and assign to campaign
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                telegram_bot_token:
 *                  type: string
 *
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *        "400" :
 *           description: Bad Request
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden, campaign not owned by user or job in progress
 *        "500":
 *           description: Internal Server Error
 */
router.post(
  '/new-credentials',
  celebrate(storeCredentialsValidator),
  CampaignMiddleware.canEditCampaign,
  TelegramMiddleware.getCredentialsFromBody,
  TelegramMiddleware.validateAndStoreCredentials,
  TelegramMiddleware.setCampaignCredential
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/credentials:
 *    post:
 *      tags:
 *        - Telegram
 *      summary: Validate stored credentials and assign to campaign
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                label:
 *                  type: string
 *
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *        "400" :
 *           description: Bad Request
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden, campaign not owned by user or job in progress
 *        "500":
 *           description: Internal Server Error
 */
router.post(
  '/credentials',
  celebrate(useCredentialsValidator),
  CampaignMiddleware.canEditCampaign,
  TelegramMiddleware.getCredentialsFromLabel,
  TelegramMiddleware.validateAndStoreCredentials,
  TelegramMiddleware.setCampaignCredential
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/credentials/verify:
 *    post:
 *      tags:
 *        - Telegram
 *      summary: Send a validation message using the campaign credentials.
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                recipient:
 *                  type: string
 *
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *        "400" :
 *           description: Bad Request
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden, campaign not owned by user or job in progress
 *        "500":
 *           description: Internal Server Error
 */
router.post(
  '/credentials/verify',
  celebrate(verifyCredentialsValidator),
  CampaignMiddleware.canEditCampaign,
  TelegramMiddleware.getCampaignCredential,
  TelegramMiddleware.sendValidationMessage
)

export default router
