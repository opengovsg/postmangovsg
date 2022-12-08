import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  JobMiddleware,
  ProtectedMiddleware,
  UploadMiddleware,
} from '@core/middlewares'
import {
  EmailMiddleware,
  EmailStatsMiddleware,
  EmailTemplateMiddleware,
} from '@email/middlewares'
import { fromAddressValidator } from '@core/utils/from-address'

export const InitEmailCampaignRoute = (
  emailTemplateMiddleware: EmailTemplateMiddleware,
  emailMiddleware: EmailMiddleware
): Router => {
  const router = Router({ mergeParams: true })

  // validators
  const storeTemplateValidator = {
    [Segments.BODY]: Joi.object({
      subject: Joi.string().required(),
      body: Joi.string().required(),
      reply_to: Joi.string()
        .trim()
        .email()
        .options({ convert: true })
        .lowercase()
        .allow(null)
        .required(),
      from: fromAddressValidator,
      show_logo: Joi.boolean().default(true),
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
      recipient: Joi.string()
        .email()
        .options({ convert: true }) // Converts email to lowercase if it isn't
        .lowercase()
        .required(),
    }),
  }

  const startMultipartValidator = {
    [Segments.QUERY]: Joi.object({
      mime_type: Joi.string().required(),
      part_count: Joi.number().integer().min(1).max(10000).default(1),
    }),
  }

  const completeMultipartValidator = {
    [Segments.BODY]: Joi.object({
      filename: Joi.string().required(),
      transaction_id: Joi.string().required(),
      part_count: Joi.number().integer().min(1).max(10000).required(),
      etags: Joi.array().items(Joi.string()).required(),
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
  router.use(emailMiddleware.isEmailCampaignOwnedByUser)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email:
   *    get:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
   *      summary: Get email campaign details
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
   *                $ref: '#/components/schemas/EmailCampaign'
   *
   *        "400" :
   *           description: Invalid campaign type or not owned by user
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
  router.get('/', emailMiddleware.getCampaignDetails)

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/email/template:
   *     put:
   *       security:
   *         - bearerAuth: []
   *       tags:
   *         - Email
   *       summary: Stores body template for email campaign
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
   *               required:
   *                 - subject
   *                 - body
   *                 - reply_to
   *                 - from
   *               properties:
   *                 subject:
   *                   type: string
   *                 body:
   *                   type: string
   *                   minLength: 1
   *                   maxLength: 200
   *                 reply_to:
   *                   type: string
   *                   nullable: true
   *                 from:
   *                   type: string
   *                 show_logo:
   *                   type: boolean
   *                   default: true
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
   *                       subject:
   *                         type: string
   *                       body:
   *                         type: string
   *                       reply_to:
   *                         type: string
   *                         nullable: true
   *                       params:
   *                         type: array
   *                         items:
   *                           type: string
   *                       from:
   *                         type: string
   *
   *         "400":
   *           description: Bad Request
   *         "401":
   *           description: Unauthorized
   *         "403":
   *           description: Forbidden. Request violates firewall rules.
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
    emailMiddleware.isCustomFromAddressAllowed,
    emailMiddleware.isFromAddressAccepted,
    emailMiddleware.existsFromAddress,
    emailMiddleware.verifyFromAddress,
    ProtectedMiddleware.verifyTemplate,
    emailTemplateMiddleware.storeTemplate
  )

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/email/upload/start:
   *     get:
   *       security:
   *         - bearerAuth: []
   *       summary: "Get a presigned URL for upload with Content-MD5 header"
   *       tags:
   *         - Email
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
   *                 required:
   *                   - presigned_url
   *                   - transaction_id
   *                 properties:
   *                   presigned_url:
   *                     type: string
   *                   transaction_id:
   *                     type: string
   *         "400" :
   *           description: Bad Request
   *         "401":
   *           description: Unauthorized
   *         "403":
   *           description: Forbidden. Request violates firewall rules.
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
   *   /campaign/{campaignId}/email/upload/complete:
   *     post:
   *       security:
   *         - bearerAuth: []
   *       summary: "Complete upload session with ETag verification"
   *       tags:
   *         - Email
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
   *           description: Forbidden. Request violates firewall rules.
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
    emailTemplateMiddleware.uploadCompleteHandler
  )

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/email/upload/status:
   *     get:
   *       security:
   *         - bearerAuth: []
   *       summary: "Get csv processing status"
   *       tags:
   *         - Email
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
   *                     required:
   *                       - subject
   *                       - body
   *                       - from
   *                     properties:
   *                       subject:
   *                         type: string
   *                       body:
   *                         type: string
   *                       replyTo:
   *                         type: string
   *                         nullable: true
   *                       from:
   *                         type: string
   *                         example: 'Postman <donotreply@mail.postman.gov.sg>'
   *                       showMasthead:
   *                         type: boolean
   *                       agencyLogoURI:
   *                         type: string
   *                         example: "https://file.go.gov.sg/postman-ogp.png"
   *                       agencyName:
   *                         type: string
   *                         example: Open Government Products
   *                       themedBody:
   *                         type: string
   *         "400" :
   *           description: Bad Request
   *         "401":
   *           description: Unauthorized
   *         "403":
   *           description: Forbidden. Request violates firewall rules.
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
  router.get('/upload/status', emailTemplateMiddleware.pollCsvStatusHandler)

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/email/upload/status:
   *     delete:
   *       security:
   *         - bearerAuth: []
   *       description: "Deletes error status from previous failed upload"
   *       tags:
   *         - Email
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
   *           description: Forbidden. Request violates firewall rules.
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
    emailTemplateMiddleware.deleteCsvErrorHandler
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/credentials:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
   *      summary: Sends a test message and defaults to Postman's credentials for the campaign
   *      requestBody:
   *         content:
   *           application/json:
   *             schema:
   *               required:
   *                 - recipient
   *               properties:
   *                 recipient:
   *                   type: string
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: object
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
    '/credentials',
    celebrate(storeCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    emailMiddleware.validateAndStoreCredentials
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/preview:
   *    get:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
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
   *                    required:
   *                      - body
   *                      - subject
   *                      - from
   *                    properties:
   *                      body:
   *                        type: string
   *                      subject:
   *                        type: string
   *                      reply_to:
   *                        type: string
   *                        nullable: true
   *                      from:
   *                        type: string
   *                        example: 'Postman <donotreply@mail.postman.gov.sg>'
   *                      themed_body:
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
  router.get('/preview', emailMiddleware.previewFirstMessage)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/send:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
   *      summary: Start sending campaign
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
    '/send',
    CampaignMiddleware.canEditCampaign,
    JobMiddleware.sendCampaign
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/stop:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
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
  router.post('/stop', JobMiddleware.stopCampaign)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/retry:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
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
   *           description: Forbidden as there is a job in progress
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
   *  /campaign/{campaignId}/email/stats:
   *    get:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
   *      summary: Get email campaign stats
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
   *                  - $ref: '#/components/schemas/CampaignStats'
   *                  - type: object
   *                    required:
   *                      - unsubscribed
   *                    properties:
   *                      unsubscribed:
   *                        type: number
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
  router.get('/stats', EmailStatsMiddleware.getStats)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/refresh-stats:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
   *      summary: Get email campaign stats
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
   *                  - $ref: '#/components/schemas/CampaignStats'
   *                  - type: object
   *                    required:
   *                      - unsubscribed
   *                    properties:
   *                      unsubscribed:
   *                        type: number
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
  router.post('/refresh-stats', EmailStatsMiddleware.updateAndGetStats)

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/export:
   *    get:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
   *      summary: Get recipients of campaign
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
   *                  allOf:
   *                    - $ref: '#/components/schemas/CampaignRecipient'
   *                    - type: object
   *                      properties:
   *                        'unsubscriber.recipient':
   *                          type: string
   *                        'unsubscriber.reason':
   *                          type: string
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
    EmailStatsMiddleware.getDeliveredRecipients
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/protect/upload/start:
   *    get:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
   *      summary: Start multipart upload
   *      parameters:
   *        - name: campaignId
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *        - name: mime_type
   *          in: query
   *          required: true
   *          schema:
   *            type: string
   *        - name: part_count
   *          in: query
   *          required: true
   *          schema:
   *            type: integer
   *            minimum: 1
   *            maximum: 100
   *            default: 1
   *      responses:
   *        200:
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                 transaction_id:
   *                  type: string
   *                 presigned_urls:
   *                  type: array
   *                  items:
   *                    type: string
   *
   *        "400" :
   *           description: Invalid campaign type, not owned by user
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
  router.get(
    '/protect/upload/start',
    celebrate(startMultipartValidator),
    CampaignMiddleware.canEditCampaign,
    ProtectedMiddleware.isProtectedCampaign,
    UploadMiddleware.startMultipartUpload
  )

  /**
   * @swagger
   * paths:
   *   /campaign/{campaignId}/email/protect/upload/complete:
   *     post:
   *       security:
   *         - bearerAuth: []
   *       summary: Complete multipart upload
   *       tags:
   *         - Email
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
   *                 - filename
   *                 - transaction_id
   *                 - part_count
   *                 - etags
   *               properties:
   *                 filename:
   *                   type: string
   *                 transaction_id:
   *                   type: string
   *                 part_count:
   *                   type: integer
   *                 etags:
   *                   type: array
   *                   items:
   *                     type: string
   *       responses:
   *         200:
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                 transaction_id:
   *                  type: string
   *         "400" :
   *           description: Bad Request
   *         "401":
   *           description: Unauthorized
   *         "403":
   *           description: Forbidden. Request violates firewall rules.
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
    '/protect/upload/complete',
    celebrate(completeMultipartValidator),
    CampaignMiddleware.canEditCampaign,
    ProtectedMiddleware.isProtectedCampaign,
    UploadMiddleware.completeMultipart,
    emailTemplateMiddleware.uploadProtectedCompleteHandler
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/duplicate:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
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
   *
   *      responses:
   *        "201":
   *           description: A duplicate of the campaign was created
   *           content:
   *            application/json:
   *              schema:
   *                $ref: '#/components/schemas/CampaignDuplicateMeta'
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
    emailMiddleware.duplicateCampaign
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/select-list:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
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
   *           schema:
   *             $ref: '#/components/schemas/CampaignMeta'
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
    emailTemplateMiddleware.selectListHandler
  )

  /**
   * @swagger
   * paths:
   *  /campaign/{campaignId}/email/cancel:
   *    post:
   *      security:
   *        - bearerAuth: []
   *      tags:
   *        - Email
   *      summary: Select the list of recipients from an existing managed list
   *      parameters:
   *        - name: campaignId
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *      responses:
   *        "200":
   *           description: Successfully cancelled scheduled campaign
   *           schema:
   *             $ref: '#/components/schemas/CampaignMeta'
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
  router.post('/cancel', JobMiddleware.cancelScheduledCampaign)

  return router
}
