import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  UploadMiddleware,
  JobMiddleware,
  ProtectedMiddleware,
} from '@core/middlewares'
import {
  EmailTemplateMiddleware,
  EmailStatsMiddleware,
  EmailMiddleware,
} from '@email/middlewares'
import config from '@core/config'
import { fromAddressValidator } from '@core/utils/from-address'

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
    recipient: Joi.string()
      .email()
      .options({ convert: true }) // Converts email to lowercase if it isn't
      .lowercase()
      .required(),
  }),
}

const sendCampaignValidator = {
  [Segments.BODY]: Joi.object({
    rate: Joi.number()
      .integer()
      .positive()
      .default(config.get('mailDefaultRate')),
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

// Routes

// Check if campaign belongs to user for this router
router.use(EmailMiddleware.isEmailCampaignOwnedByUser)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email:
 *    get:
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
 *        "500":
 *           description: Internal Server Error
 */
router.get('/', EmailMiddleware.getCampaignDetails)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/email/template:
 *     put:
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
 *           description: Forbidden as there is a job in progress
 *         "500":
 *           description: Internal Server Error
 */
router.put(
  '/template',
  celebrate(storeTemplateValidator),
  CampaignMiddleware.canEditCampaign,
  EmailMiddleware.isFromAddressAccepted,
  EmailMiddleware.existsFromAddress,
  EmailMiddleware.verifyFromAddress,
  ProtectedMiddleware.verifyTemplate,
  EmailTemplateMiddleware.storeTemplate
)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/email/upload/start:
 *     get:
 *       description: "Get a presigned URL for upload"
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
 *         "400" :
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "403":
 *           description: Forbidden as there is a job in progress
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
 *   /campaign/{campaignId}/email/upload/start-v2:
 *     get:
 *       description: "Get a presigned URL for upload with Content-MD5 header"
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
 *           description: Forbidden as there is a job in progress
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
 *   /campaign/{campaignId}/email/upload/complete:
 *     post:
 *       description: "Complete upload session"
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
 *       responses:
 *         "202" :
 *           description: Accepted. The uploaded file is being processed.
 *         "400" :
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "403":
 *           description: Forbidden as there is a job in progress
 *         "500":
 *           description: Internal Server Error
 */
router.post(
  '/upload/complete',
  celebrate(uploadCompleteValidator.v1),
  CampaignMiddleware.canEditCampaign,
  EmailTemplateMiddleware.uploadCompleteHandler
)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/email/upload/complete-v2:
 *     post:
 *       description: "Complete upload session with ETag verification"
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
 *           description: Forbidden as there is a job in progress
 *         "500":
 *           description: Internal Server Error
 */
router.post(
  '/upload/complete-v2',
  celebrate(uploadCompleteValidator.v2),
  CampaignMiddleware.canEditCampaign,
  EmailTemplateMiddleware.uploadCompleteHandler
)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/email/upload/status:
 *     get:
 *       description: "Get csv processing status"
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
 *                     properties:
 *                       subject:
 *                         type: string
 *                       body:
 *                         type: string
 *                       reply_to:
 *                         type: string
 *                         nullable: true
 *         "400" :
 *           description: Bad Request
 *         "401":
 *           description: Unauthorized
 *         "403":
 *           description: Forbidden as there is a job in progress
 *         "500":
 *           description: Internal Server Error
 */
router.get('/upload/status', EmailTemplateMiddleware.pollCsvStatusHandler)

/**
 * @swagger
 * post:
 *   /campaign/{campaignId}/email/upload/status:
 *     delete:
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
 *           description: Forbidden as there is a job in progress
 *         "500":
 *           description: Internal Server Error
 */
router.delete(
  '/upload/status',
  CampaignMiddleware.canEditCampaign,
  EmailTemplateMiddleware.deleteCsvErrorHandler
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/credentials:
 *    post:
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
 *           description: Forbidden as there is a job in progress
 *        "500":
 *           description: Internal Server Error
 */
router.post(
  '/credentials',
  celebrate(storeCredentialsValidator),
  CampaignMiddleware.canEditCampaign,
  EmailMiddleware.validateAndStoreCredentials
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/preview:
 *    get:
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
 *                    properties:
 *                      body:
 *                        type: string
 *                      subject:
 *                        type: string
 *                      reply_to:
 *                        type: string
 *                        nullable: true
 *        "401":
 *           description: Unauthorized
 *        "500":
 *           description: Internal Server Error
 */
router.get('/preview', EmailMiddleware.previewFirstMessage)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/send:
 *    post:
 *      tags:
 *        - Email
 *      summary: Start sending campaign
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                rate:
 *                  type: integer
 *                  minimum: 1
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
 *           description: Forbidden as there is a job in progress
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
 *  /campaign/{campaignId}/email/stop:
 *    post:
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
 *        "500":
 *           description: Internal Server Error
 */
router.post('/stop', JobMiddleware.stopCampaign)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/retry:
 *    post:
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
 *  /campaign/{campaignId}/email/stats:
 *    get:
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
 *                $ref: '#/components/schemas/CampaignStats'
 *        "401":
 *           description: Unauthorized
 *        "500":
 *           description: Internal Server Error
 */
router.get('/stats', EmailStatsMiddleware.getStats)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/refresh-stats:
 *    post:
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
 *                $ref: '#/components/schemas/CampaignStats'
 *        "401":
 *           description: Unauthorized
 *        "500":
 *           description: Internal Server Error
 */
router.post('/refresh-stats', EmailStatsMiddleware.updateAndGetStats)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/export:
 *    get:
 *      tags:
 *        - Email
 *      summary: Get recipients of unsuccessful emails in campaign
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
 *        "410":
 *           description: Campaign has been redacted
 *        "500":
 *           description: Internal Server Error
 */
router.get(
  '/export',
  CampaignMiddleware.isCampaignRedacted,
  EmailStatsMiddleware.getDeliveredRecipients
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/email/protect/upload/start:
 *    get:
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
 *        "500":
 *           description: Internal Server Error
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
 * path:
 *   /campaign/{campaignId}/email/protect/upload/complete:
 *     post:
 *       description: Complete multipart upload
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
 *         "500":
 *           description: Internal Server Error
 */
router.post(
  '/protect/upload/complete',
  celebrate(completeMultipartValidator),
  CampaignMiddleware.canEditCampaign,
  ProtectedMiddleware.isProtectedCampaign,
  UploadMiddleware.completeMultipart,
  EmailTemplateMiddleware.uploadProtectedCompleteHandler
)

export default router
