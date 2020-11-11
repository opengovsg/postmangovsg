import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  UploadMiddleware,
  JobMiddleware,
  SettingsMiddleware,
} from '@core/middlewares'
import {
  TelegramMiddleware,
  TelegramStatsMiddleware,
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
  v1: {
    [Segments.QUERY]: Joi.object({
      mime_type: Joi.string().required(),
    }),
  },
  v2: {
    [Segments.QUERY]: Joi.object({
      mime_type: Joi.string().required(),
      md5: Joi.string().required(),
    }),
  },
}

const uploadCompleteValidator = {
  v1: {
    [Segments.BODY]: Joi.object({
      transaction_id: Joi.string().required(),
      filename: Joi.string().required(),
    }),
  },
  v2: {
    [Segments.BODY]: Joi.object({
      transaction_id: Joi.string().required(),
      filename: Joi.string().required(),
      etag: Joi.string().required(),
    }),
  },
}

const storeCredentialsValidator = {
  [Segments.BODY]: Joi.object({
    telegram_bot_token: Joi.string().trim().required(),
  }),
}

const storeCredentialsValidatorV2 = {
  [Segments.BODY]: Joi.object({
    telegram_bot_token: Joi.string().trim().required(),
    label: Joi.string()
      .min(1)
      .max(50)
      .pattern(/^[a-z0-9-]+$/)
      .optional(),
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

const sendCampaignValidator = {
  [Segments.BODY]: Joi.object({
    rate: Joi.number().integer().positive().max(30).default(30),
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
  celebrate(uploadStartValidator.v1),
  CampaignMiddleware.canEditCampaign,
  UploadMiddleware.uploadStartHandler
)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/telegram/upload/start-v2:
 *     get:
 *       description: "Get a presigned URL for upload with Content-MD5 header"
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
 *         - name: md5
 *           required: true
 *           in: query
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
  '/upload/start-v2',
  celebrate(uploadStartValidator.v2),
  CampaignMiddleware.canEditCampaign,
  UploadMiddleware.uploadStartHandler
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
  celebrate(uploadCompleteValidator.v1),
  CampaignMiddleware.canEditCampaign,
  TelegramTemplateMiddleware.uploadCompleteHandler
)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/telegram/upload/complete-v2:
 *     post:
 *       description: "Complete upload session with ETag verification"
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
 *                 etag:
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
  '/upload/complete-v2',
  celebrate(uploadCompleteValidator.v2),
  CampaignMiddleware.canEditCampaign,
  TelegramTemplateMiddleware.uploadCompleteHandler
)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/telegram/upload/status:
 *     get:
 *       description: "Get csv processing status"
 *       tags:
 *         - Telegram
 *       parameters:
 *         - name: campaignId
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       responses:
 *         200:
 *           description: Success
 *           content:
 *             application/json:
 *               schema:
 *                 properties:
 *                   is_csv_processing:
 *                     type: boolean
 *                   csv_filename:
 *                     type: string
 *                   temp_csv_filename:
 *                     type: string
 *                   csv_error:
 *                     type: string
 *                   num_recipients:
 *                     type: number
 *                   preview:
 *                     type: object
 *                     properties:
 *                       subject:
 *                         type: string
 *                       body:
 *                         type: string
 *         "400" :
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "403":
 *           description: Forbidden as there is a job in progress
 *         "500":
 *           description: Internal Server Error
 */
router.get('/upload/status', TelegramTemplateMiddleware.pollCsvStatusHandler)

/**
 * @swagger
 * post:
 *   /campaign/{campaignId}/telegram/upload/status:
 *     delete:
 *       description: "Deletes error status from previous failed upload"
 *       tags:
 *         - Telegram
 *       parameters:
 *         - name: campaignId
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       responses:
 *         200:
 *           description: Success
 *         "401":
 *           description: Unauthorized
 *         "403":
 *           description: Forbidden as there is a job in progress
 *         "500":
 *           description: Internal Server Error
 */
router.delete(
  '/upload/status',
  CampaignMiddleware.canEditCampaign,
  TelegramTemplateMiddleware.deleteCsvErrorHandler
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
  TelegramMiddleware.disabledForDemoCampaign,
  TelegramMiddleware.getCredentialsFromBody,
  TelegramMiddleware.validateAndStoreCredentials,
  TelegramMiddleware.setCampaignCredential
)
/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/new-credentials/v2:
 *    post:
 *      tags:
 *        - Telegram
 *      summary: Validate Telegram bot token and assign to campaign, if label is provided store new telegram credentials for user
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
 *                label:
 *                      type: string
 *                      pattern: '/^[a-z0-9-]+$/'
 *                      minLength: 1
 *                      maxLength: 50
 *                      description: should only consist of lowercase alphanumeric characters and dashes
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
  '/new-credentials/v2',
  celebrate(storeCredentialsValidatorV2),
  CampaignMiddleware.canEditCampaign,
  TelegramMiddleware.disabledForDemoCampaign,
  TelegramMiddleware.getCredentialsFromBody,
  TelegramMiddleware.validateAndStoreCredentials,
  SettingsMiddleware.checkAndStoreLabelIfExists,
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

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/send:
 *    post:
 *      tags:
 *        - Telegram
 *      summary: Start sending campaign
 *      parameters:
 *        - name: campaignId
 *          in: path
 *          required: true
 *          schema:
 *            type: string
 *      requestBody:
 *        required: false
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                rate:
 *                  type: integer
 *                  default: 30
 *                  minimum: 1
 *                  maximum: 30
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                 campaign_id:
 *                  type: integer
 *                 job_id:
 *                  type: array
 *                  items:
 *                    type: number
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
  '/send',
  celebrate(sendCampaignValidator),
  CampaignMiddleware.canEditCampaign,
  JobMiddleware.sendCampaign
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/stop:
 *    post:
 *      tags:
 *        - Telegram
 *      summary: Stop sending campaign
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                 campaign_id:
 *                  type: integer
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden, campaign not owned by user
 *        "500":
 *           description: Internal Server Error
 */
router.post('/stop', JobMiddleware.stopCampaign)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/retry:
 *    post:
 *      tags:
 *        - Telegram
 *      summary: Retry sending campaign
 *
 *      responses:
 *        200:
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                 campaign_id:
 *                  type: integer
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden, campaign not owned by user or job in progress
 *        "500":
 *           description: Internal Server Error
 */
router.post(
  '/retry',
  CampaignMiddleware.canEditCampaign,
  JobMiddleware.retryCampaign
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/stats:
 *    get:
 *      tags:
 *        - Telegram
 *      summary: Get telegram campaign stats
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
 *                $ref: '#/components/schemas/CampaignStats'
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden, campaign not owned by user
 *        "500":
 *           description: Internal Server Error
 */
router.get('/stats', TelegramStatsMiddleware.getStats)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/update-stats:
 *    post:
 *      tags:
 *        - Telegram
 *      summary: Get telegram campaign stats
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
 *                $ref: '#/components/schemas/CampaignStats'
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden, campaign not owned by user
 *        "500":
 *           description: Internal Server Error
 */
router.post('/refresh-stats', TelegramStatsMiddleware.updateAndGetStats)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/telegram/export:
 *    get:
 *      tags:
 *        - Telegram
 *      summary: Get invalid recipients in campaign
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
 *                type: array
 *                items:
 *                  $ref: '#/components/schemas/CampaignInvalidRecipient'
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden, campaign not owned by user
 *        "500":
 *           description: Internal Server Error
 */
router.get('/export', TelegramStatsMiddleware.getDeliveredRecipients)

export default router
