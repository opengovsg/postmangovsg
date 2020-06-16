import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  TemplateMiddleware,
  JobMiddleware,
} from '@core/middlewares'
import {
  SmsMiddleware,
  SmsStatsMiddleware,
  SmsTemplateMiddleware,
} from '@sms/middlewares'

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
    twilio_account_sid: Joi.string().trim().required(),
    twilio_api_secret: Joi.string().trim().required(),
    twilio_api_key: Joi.string().trim().required(),
    twilio_messaging_service_sid: Joi.string().trim().required(),
    recipient: Joi.string().trim().required(),
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

// Routes

// Check if campaign belongs to user for this router
router.use(SmsMiddleware.isSmsCampaignOwnedByUser)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms:
 *    get:
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
 *                $ref: '#/components/schemas/SMSCampaign'
 *
 *        "401":
 *           description: Unauthorized
 *        "403" :
 *           description: Forbidden, campaign not owned by user or job in progress
 *        "500":
 *           description: Internal Server Error
 */
router.get('/', SmsMiddleware.getCampaignDetails)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/sms/template:
 *     put:
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
 *         "500":
 *           description: Internal Server Error
 */
router.put(
  '/template',
  celebrate(storeTemplateValidator),
  CampaignMiddleware.canEditCampaign,
  SmsTemplateMiddleware.storeTemplate
)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/sms/upload/start:
 *     get:
 *       description: "Get a presigned URL for upload"
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
 *   /campaign/{campaignId}/sms/upload/complete:
 *     post:
 *       description: "Complete upload session"
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
 *       responses:
 *         "202" :
 *           description: Accepted. The uploaded file is being processed.
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
  SmsTemplateMiddleware.uploadCompleteHandler
)

/**
 * @swagger
 * path:
 *   /campaign/{campaignId}/sms/upload/status:
 *     get:
 *       description: "Get csv processing status"
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
router.get('/upload/status', SmsTemplateMiddleware.pollCsvStatusHandler)

/**
 * @swagger
 * post:
 *   /campaign/{campaignId}/sms/upload/status:
 *     delete:
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
 *         "500":
 *           description: Internal Server Error
 */
router.delete(
  '/upload/status',
  CampaignMiddleware.canEditCampaign,
  SmsTemplateMiddleware.deleteCsvErrorHandler
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms/new-credentials:
 *    post:
 *      tags:
 *        - SMS
 *      summary: Validate twilio credentials and assign to campaign
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
  SmsMiddleware.getCredentialsFromBody,
  SmsMiddleware.validateAndStoreCredentials,
  SmsMiddleware.setCampaignCredential
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms/credentials:
 *    post:
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
  SmsMiddleware.getCredentialsFromLabel,
  SmsMiddleware.validateAndStoreCredentials,
  SmsMiddleware.setCampaignCredential
)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms/preview:
 *    get:
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
 *        "500":
 *           description: Internal Server Error
 */
router.get('/preview', SmsMiddleware.previewFirstMessage)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms/send:
 *    post:
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
 *  /campaign/{campaignId}/sms/stop:
 *    post:
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
 *           description: Forbidden, campaign not owned by user
 *        "500":
 *           description: Internal Server Error
 */
router.post('/stop', JobMiddleware.stopCampaign)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms/retry:
 *    post:
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
 *  /campaign/{campaignId}/sms/stats:
 *    get:
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
 *        "500":
 *           description: Internal Server Error
 */
router.get('/stats', SmsStatsMiddleware.getStats)

/**
 * @swagger
 * path:
 *  /campaign/{campaignId}/sms/invalid-recipients:
 *    get:
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
 *                  $ref: '#/components/schemas/CampaignInvalidRecipient'
 *        "401":
 *           description: Unauthorized
 *        "403":
 *           description: Forbidden, campaign not owned by user
 *        "500":
 *           description: Internal Server Error
 */
router.get('/export', SmsStatsMiddleware.getFailedRecipients)

export default router
