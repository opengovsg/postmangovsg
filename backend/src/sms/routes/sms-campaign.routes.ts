import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  JobMiddleware,
  SettingsMiddleware,
  UploadMiddleware,
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

  router.get('/', smsMiddleware.getCampaignDetails)

  router.put(
    '/template',
    celebrate(storeTemplateValidator),
    CampaignMiddleware.canEditCampaign,
    SmsTemplateMiddleware.storeTemplate
  )

  router.get(
    '/upload/start',
    celebrate(uploadStartValidator),
    CampaignMiddleware.canEditCampaign,
    UploadMiddleware.uploadStartHandler
  )

  router.post(
    '/upload/complete',
    celebrate(uploadCompleteValidator),
    CampaignMiddleware.canEditCampaign,
    SmsTemplateMiddleware.uploadCompleteHandler
  )

  router.get('/upload/status', SmsTemplateMiddleware.pollCsvStatusHandler)

  router.delete(
    '/upload/status',
    CampaignMiddleware.canEditCampaign,
    SmsTemplateMiddleware.deleteCsvErrorHandler
  )

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

  router.post(
    '/credentials',
    celebrate(useCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    smsMiddleware.getCredentialsFromLabel,
    smsMiddleware.validateAndStoreCredentials,
    smsMiddleware.setCampaignCredential
  )

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
    CampaignMiddleware.canSendCampaign,
    JobMiddleware.sendCampaign
  )

  router.post('/stop', JobMiddleware.stopCampaign)

  router.post(
    '/retry',
    CampaignMiddleware.canEditCampaign,
    JobMiddleware.retryCampaign
  )

  router.get('/stats', SmsStatsMiddleware.getStats)

  router.post('/refresh-stats', SmsStatsMiddleware.updateAndGetStats)

  router.get(
    '/export',
    CampaignMiddleware.isCampaignRedacted,
    SmsStatsMiddleware.getDeliveredRecipients
  )

  router.post(
    '/duplicate',
    celebrate(duplicateCampaignValidator),
    smsMiddleware.duplicateCampaign
  )

  router.post(
    '/select-list',
    celebrate(selectListValidator),
    SmsTemplateMiddleware.selectListHandler
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
