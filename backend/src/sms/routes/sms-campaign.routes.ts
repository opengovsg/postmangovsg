import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  UploadMiddleware,
  JobMiddleware,
  SettingsMiddleware,
} from '@core/middlewares'
import {
  SmsMiddleware,
  SmsStatsMiddleware,
  SmsTemplateMiddleware,
} from '@sms/middlewares'

export const InitSmsCampaignRoute = (
  smsMiddleware: SmsMiddleware,
  settingsMiddleware: SettingsMiddleware
): Router => {
  const router = Router({ mergeParams: true })

  // validators
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
      twilio_account_sid: Joi.string().trim().required(),
      twilio_api_secret: Joi.string().trim().required(),
      twilio_api_key: Joi.string().trim().required(),
      twilio_messaging_service_sid: Joi.string().trim().required(),
      recipient: Joi.string().trim().required(),
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
      recipient: Joi.string().trim().required(),
    }),
  }

  const sendCampaignValidator = {
    [Segments.BODY]: Joi.object({
      rate: Joi.number().integer().positive().default(10),
    }),
  }

  const duplicateCampaignValidator = {
    [Segments.BODY]: Joi.object({
      name: Joi.string().max(255).trim().required(),
    }),
  }

  const selectListValidator = {
    [Segments.BODY]: Joi.object({
      list_id: Joi.number().required(),
    }),
  }

  // Routes

  // Check if campaign belongs to user for this router
  router.use(smsMiddleware.isSmsCampaignOwnedByUser)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms:
   *    get:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
   *      summary: Get sms campaign details
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
   *                allOf:
   *                - $ref: '#/components/schemas/SMSCampaign'
   *                - type: object
   *                  properties:
   *                    cost_per_message:
   *                      type: number
   *
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
  router.get('/', smsMiddleware.getCampaignDetails)

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/sms/template:
   *     put:
   *       security:
   *         - bearerAuth: []
   *       tags:
   *         - SMS
   *       summary: Stores body template for sms campaign
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
    SmsTemplateMiddleware.storeTemplate
  )

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/sms/upload/start:
   *     get:
   *       security:
   *         - bearerAuth: []
   *       summary: "Get a presigned URL for upload with Content-MD5 header"
   *       tags:
   *         - SMS
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
   *   /campaign/{campaignId}/sms/upload/complete:
   *     post:
   *       security:
   *         - bearerAuth: []
   *       summary: "Complete upload session with ETag verification"
   *       tags:
   *         - SMS
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
    SmsTemplateMiddleware.uploadCompleteHandler
  )

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/sms/upload/status:
   *     get:
   *       security:
   *         - bearerAuth: []
   *       summary: "Get csv processing status"
   *       tags:
   *         - SMS
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
   *         "500":
   *           description: Internal Server Error
   */
  router.get('/upload/status', SmsTemplateMiddleware.pollCsvStatusHandler)

  /**
   * @swagger
   * post:
   *   /campaign/{campaignId}/sms/upload/status:
   *     delete:
   *       security:
   *         - bearerAuth: []
   *       description: "Deletes error status from previous failed upload"
   *       tags:
   *         - SMS
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
    SmsTemplateMiddleware.deleteCsvErrorHandler
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms/new-credentials:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
   *      summary: Validate twilio credentials and assign to campaign, if label is provided - store credentials for user
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
   *              allOf:
   *                - $ref: '#/components/schemas/TwilioCredentials'
   *                - type: object
   *                  properties:
   *                    recipient:
   *                      type: string
   *                    label:
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
    '/new-credentials',
    celebrate(storeCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    smsMiddleware.canValidateCredentials,
    smsMiddleware.disabledForDemoCampaign,
    smsMiddleware.getCredentialsFromBody,
    smsMiddleware.validateAndStoreCredentials,
    settingsMiddleware.checkAndStoreLabelIfExists,
    smsMiddleware.setCampaignCredential
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms/credentials:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
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
   *                recipient:
   *                  type: string
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
    '/credentials',
    celebrate(useCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    smsMiddleware.getCredentialsFromLabel,
    smsMiddleware.validateAndStoreCredentials,
    smsMiddleware.setCampaignCredential
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms/preview:
   *    get:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
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
  router.get('/preview', smsMiddleware.previewFirstMessage)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms/send:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
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
   *                  example: 10
   *                  type: integer
   *                  minimum: 1
   *                scheduled_timing:
   *                  example: "2014-09-15T09:00:00"
   *                  type: string
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
   *          description: Invalid SSL certificate
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
   *  /campaign/{campaignId}/sms/stop:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
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
  router.post('/stop', JobMiddleware.stopCampaign)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms/retry:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
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
   *          description: Invalid SSL certificate
   */
  router.post(
    '/retry',
    CampaignMiddleware.canEditCampaign,
    JobMiddleware.retryCampaign
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms/stats:
   *    get:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
   *      summary: Get sms campaign stats
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
   *          description: Invalid SSL certificate
   */
  router.get('/stats', SmsStatsMiddleware.getStats)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms/refresh-stats:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
   *      summary: Forcibly refresh sms campaign stats, then retrieves them
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
   *          description: Invalid SSL certificate
   */
  router.post('/refresh-stats', SmsStatsMiddleware.updateAndGetStats)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms/export:
   *    get:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
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
   *          description: Invalid SSL certificate
   */
  router.get(
    '/export',
    CampaignMiddleware.isCampaignRedacted,
    SmsStatsMiddleware.getDeliveredRecipients
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms/duplicate:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
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
   *              required:
   *                - name
   *              properties:
   *                name:
   *                  type: string
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
   *          description: Invalid SSL certificate
   */
  router.post(
    '/duplicate',
    celebrate(duplicateCampaignValidator),
    smsMiddleware.duplicateCampaign
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/sms/select-list:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - SMS
   *      summary: Select the list of recipients from an existing managed list
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
   *                list_id:
   *                  type: number
   *
   *      responses:
   *        "201":
   *           description: A duplicate of the campaign was created
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
    '/select-list',
    celebrate(selectListValidator),
    SmsTemplateMiddleware.selectListHandler
  )

  return router
}
