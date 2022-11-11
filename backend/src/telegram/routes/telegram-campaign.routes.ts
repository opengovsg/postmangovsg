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

export const InitTelegramCampaignMiddleware = (
  settingsMiddleware: SettingsMiddleware,
  telegramMiddleware: TelegramMiddleware
): Router => {
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
      md5: Joi.string().required(),
    }),
  }

  const uploadCompleteValidator = {
    [Segments.BODY]: Joi.object({
      transaction_id: Joi.string().required(),
      filename: Joi.string().required(),
      etag: Joi.string().required(),
    }),
  }

  const storeCredentialsValidator = {
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

  const duplicateCampaignValidator = {
    [Segments.BODY]: Joi.object({
      name: Joi.string().max(255).trim().required(),
    }),
  }

  // Routes

  // Check if campaign belongs to user for this router
  router.use(telegramMiddleware.isTelegramCampaignOwnedByUser)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram:
   *    get:
   *      security:
   *        - bearerAuth: []
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
  router.get('/', telegramMiddleware.getCampaignDetails)

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/telegram/template:
   *     put:
   *       security:
   *         - bearerAuth: []
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
   *         "429":
   *           description: Rate limit exceeded. Too many requests.
   *           content:
   *              application/json:
   *                schema:
   *                  $ref: '#/components/schemas/ErrorStatus'
   *                example:
   *                  {status: 429, message: Too many requests. Please try again later.}
   *         "500":
   *           description: Internal Server Error
   *           content:
   *              text/plain:
   *                type: string
   *                example: Internal Server Error
   *         "502":
   *           description: Bad Gateway
   *         "504":
   *           description: Gateway Timeout
   *         "503":
   *           description: Service Temporarily Unavailable
   *         "520":
   *           description: Web Server Returns An Unknown Error
   *         "521":
   *           description: Web Server Is Down
   *         "522":
   *           description: Connection Timed Out
   *         "523":
   *           description: Origin Is Unreachable
   *         "524":
   *           description: A Timeout occurred
   *         "525":
   *           description: SSL handshake failed
   *         "526":
   *           description: Invalid SSL certificate
   */
  router.put(
    '/template',
    celebrate(storeTemplateValidator),
    CampaignMiddleware.canEditCampaign,
    TelegramTemplateMiddleware.storeTemplate
  )

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/telegram/upload/start:
   *     get:
   *       security:
   *         - bearerAuth: []
   *       summary: "Get a presigned URL for upload with Content-MD5 header"
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
   *         "429":
   *           description: Rate limit exceeded. Too many requests.
   *           content:
   *              application/json:
   *                schema:
   *                  $ref: '#/components/schemas/ErrorStatus'
   *                example:
   *                  {status: 429, message: Too many requests. Please try again later.}
   *         "500":
   *           description: Internal Server Error
   *           content:
   *              text/plain:
   *                type: string
   *                example: Internal Server Error
   *         "502":
   *           description: Bad Gateway
   *         "504":
   *           description: Gateway Timeout
   *         "503":
   *           description: Service Temporarily Unavailable
   *         "520":
   *           description: Web Server Returns An Unknown Error
   *         "521":
   *           description: Web Server Is Down
   *         "522":
   *           description: Connection Timed Out
   *         "523":
   *           description: Origin Is Unreachable
   *         "524":
   *           description: A Timeout occurred
   *         "525":
   *           description: SSL handshake failed
   *         "526":
   *           description: Invalid SSL certificate
   */
  router.get(
    '/upload/start',
    celebrate(uploadStartValidator),
    CampaignMiddleware.canEditCampaign,
    UploadMiddleware.uploadStartHandler
  )

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/telegram/upload/complete:
   *     post:
   *       security:
   *         - bearerAuth: []
   *       summary: "Complete upload session with ETag verification"
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
   *         "202" :
   *           description: Accepted. The uploaded file is being processed.
   *         "400" :
   *           description: Bad Request
   *         "401":
   *           description: Unauthorized
   *         "403":
   *          description: Forbidden, campaign not owned by user or job in progress
   *         "429":
   *           description: Rate limit exceeded. Too many requests.
   *           content:
   *              application/json:
   *                schema:
   *                  $ref: '#/components/schemas/ErrorStatus'
   *                example:
   *                  {status: 429, message: Too many requests. Please try again later.}
   *         "500":
   *           description: Internal Server Error
   *           content:
   *              text/plain:
   *                type: string
   *                example: Internal Server Error
   *         "502":
   *           description: Bad Gateway
   *         "504":
   *           description: Gateway Timeout
   *         "503":
   *           description: Service Temporarily Unavailable
   *         "520":
   *           description: Web Server Returns An Unknown Error
   *         "521":
   *           description: Web Server Is Down
   *         "522":
   *           description: Connection Timed Out
   *         "523":
   *           description: Origin Is Unreachable
   *         "524":
   *           description: A Timeout occurred
   *         "525":
   *           description: SSL handshake failed
   *         "526":
   *           description: Invalid SSL certificate
   */
  router.post(
    '/upload/complete',
    celebrate(uploadCompleteValidator),
    CampaignMiddleware.canEditCampaign,
    TelegramTemplateMiddleware.uploadCompleteHandler
  )

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/telegram/upload/status:
   *     get:
   *       security:
   *         - bearerAuth: []
   *       summary: "Get csv processing status"
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
   *                       body:
   *                         type: string
   *         "400" :
   *           description: Bad Request
   *         "401":
   *           description: Unauthorized
   *         "403":
   *           description: Forbidden as there is a job in progress
   *         "429":
   *           description: Rate limit exceeded. Too many requests.
   *           content:
   *              application/json:
   *                schema:
   *                  $ref: '#/components/schemas/ErrorStatus'
   *                example:
   *                  {status: 429, message: Too many requests. Please try again later.}
   *         "500":
   *           description: Internal Server Error
   *           content:
   *              text/plain:
   *                type: string
   *                example: Internal Server Error
   *         "502":
   *           description: Bad Gateway
   *         "504":
   *           description: Gateway Timeout
   *         "503":
   *           description: Service Temporarily Unavailable
   *         "520":
   *           description: Web Server Returns An Unknown Error
   *         "521":
   *           description: Web Server Is Down
   *         "522":
   *           description: Connection Timed Out
   *         "523":
   *           description: Origin Is Unreachable
   *         "524":
   *           description: A Timeout occurred
   *         "525":
   *           description: SSL handshake failed
   *         "526":
   *           description: Invalid SSL certificate
   */
  router.get('/upload/status', TelegramTemplateMiddleware.pollCsvStatusHandler)

  /**
   * @swagger
   * post:
   *   /campaign/{campaignId}/telegram/upload/status:
   *     delete:
   *       security:
   *         - bearerAuth: []
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
   *         "429":
   *           description: Rate limit exceeded. Too many requests.
   *           content:
   *              application/json:
   *                schema:
   *                  $ref: '#/components/schemas/ErrorStatus'
   *                example:
   *                  {status: 429, message: Too many requests. Please try again later.}
   *         "500":
   *           description: Internal Server Error
   *           content:
   *              text/plain:
   *                type: string
   *                example: Internal Server Error
   *         "502":
   *           description: Bad Gateway
   *         "504":
   *           description: Gateway Timeout
   *         "503":
   *           description: Service Temporarily Unavailable
   *         "520":
   *           description: Web Server Returns An Unknown Error
   *         "521":
   *           description: Web Server Is Down
   *         "522":
   *           description: Connection Timed Out
   *         "523":
   *           description: Origin Is Unreachable
   *         "524":
   *           description: A Timeout occurred
   *         "525":
   *           description: SSL handshake failed
   *         "526":
   *           description: Invalid SSL certificate
   */
  router.delete(
    '/upload/status',
    CampaignMiddleware.canEditCampaign,
    TelegramTemplateMiddleware.deleteCsvErrorHandler
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/preview:
   *    get:
   *      security:
   *        - bearerAuth: []
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
  router.get('/preview', telegramMiddleware.previewFirstMessage)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/new-credentials:
   *    post:
   *      security:
   *        - bearerAuth: []
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
   *                required:
   *                  - message
   *                properties:
   *                  message:
   *                    type: string
   *                    example: OK
   *        "400" :
   *           description: Bad Request
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
    '/new-credentials',
    celebrate(storeCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    telegramMiddleware.disabledForDemoCampaign,
    telegramMiddleware.getCredentialsFromBody,
    telegramMiddleware.validateAndStoreCredentials,
    settingsMiddleware.checkAndStoreLabelIfExists,
    telegramMiddleware.setCampaignCredential
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/credentials:
   *    post:
   *      security:
   *        - bearerAuth: []
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
   *                required:
   *                  - message
   *                properties:
   *                  message:
   *                    type: string
   *                    example: OK
   *        "400" :
   *           description: Bad Request
   *        "401":
   *           description: Unauthorized
   *        "403":
   *           description: Forbidden, campaign not owned by user
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
    '/credentials',
    celebrate(useCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    telegramMiddleware.getCredentialsFromLabel,
    telegramMiddleware.validateAndStoreCredentials,
    telegramMiddleware.setCampaignCredential
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/credentials/verify:
   *    post:
   *      security:
   *        - bearerAuth: []
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
   *                required:
   *                  - message
   *                properties:
   *                  message:
   *                    type: string
   *                    example: OK
   *        "400" :
   *           description: Bad Request
   *        "401":
   *           description: Unauthorized
   *        "403":
   *           description: Forbidden, campaign not owned by user or job in progress
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
    '/credentials/verify',
    celebrate(verifyCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    telegramMiddleware.getCampaignCredential,
    telegramMiddleware.sendValidationMessage
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/send:
   *    post:
   *      security:
   *        - bearerAuth: []
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
   *          description: Invalid SSL c
   */
  router.post(
    '/send',
    celebrate(sendCampaignValidator),
    CampaignMiddleware.canEditCampaign,
    JobMiddleware.sendCampaign
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/stop:
   *    post:
   *      security:
   *        - bearerAuth: []
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
   *          description: Invalid SSL c
   */
  router.post('/stop', JobMiddleware.stopCampaign)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/retry:
   *    post:
   *      security:
   *        - bearerAuth: []
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
   *          description: Invalid SSL c
   */
  router.post(
    '/retry',
    CampaignMiddleware.canEditCampaign,
    JobMiddleware.retryCampaign
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/stats:
   *    get:
   *      security:
   *        - bearerAuth: []
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
   *          description: Invalid SSL c
   */
  router.get('/stats', TelegramStatsMiddleware.getStats)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/update-stats:
   *    post:
   *      security:
   *        - bearerAuth: []
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
   *          description: Invalid SSL c
   */
  router.post('/refresh-stats', TelegramStatsMiddleware.updateAndGetStats)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/export:
   *    get:
   *      security:
   *        - bearerAuth: []
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
   *                  $ref: '#/components/schemas/CampaignRecipient'
   *        "401":
   *           description: Unauthorized
   *        "403":
   *           description: Forbidden, campaign not owned by user
   *        "410":
   *           description: Campaign has been redacted
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
   *          description: Invalid SSL c
   */
  router.get(
    '/export',
    CampaignMiddleware.isCampaignRedacted,
    TelegramStatsMiddleware.getDeliveredRecipients
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/telegram/duplicate:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Telegram
   *      summary: Duplicate the campaign and its template
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
   *                name:
   *                  type: string
   *
   *      responses:
   *        "201":
   *           description: A duplicate of the campaign was created
   *           content:
   *             application/json:
   *               schema:
   *                 $ref: '#/components/schemas/CampaignDuplicateMeta'
   *        "401":
   *           description: Unauthorized
   *        "403":
   *           description: Forbidden, campaign not owned by user
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
   *          description: Invalid SSL c
   */
  router.post(
    '/duplicate',
    celebrate(duplicateCampaignValidator),
    telegramMiddleware.duplicateCampaign
  )

  return router
}
