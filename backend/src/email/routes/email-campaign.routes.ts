import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  TemplateMiddleware,
  JobMiddleware,
} from '@core/middlewares'
import {
  EmailTemplateMiddleware,
  EmailStatsMiddleware,
  EmailMiddleware,
} from '@email/middlewares'

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
    recipient: Joi.string()
      .email()
      .options({ convert: true }) // Converts email to lowercase if it isn't
      .lowercase()
      .required(),
  }),
}

const sendCampaignValidator = {
  [Segments.BODY]: Joi.object({
    rate: Joi.number().integer().positive().default(35),
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
  celebrate(uploadStartValidator),
  CampaignMiddleware.canEditCampaign,
  TemplateMiddleware.uploadStartHandler
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
  celebrate(uploadCompleteValidator),
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
 *  /campaign/{campaignId}/email/invalid-recipients:
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
 *        "500":
 *           description: Internal Server Error
 */
router.get('/invalid-recipients', EmailStatsMiddleware.getInvalidRecipients)

export default router
