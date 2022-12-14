import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  JobMiddleware,
  SettingsMiddleware,
  UploadMiddleware,
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

  router.get('/', telegramMiddleware.getCampaignDetails)

  router.put(
    '/template',
    celebrate(storeTemplateValidator),
    CampaignMiddleware.canEditCampaign,
    TelegramTemplateMiddleware.storeTemplate
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
    TelegramTemplateMiddleware.uploadCompleteHandler
  )

  router.get('/upload/status', TelegramTemplateMiddleware.pollCsvStatusHandler)

  router.delete(
    '/upload/status',
    CampaignMiddleware.canEditCampaign,
    TelegramTemplateMiddleware.deleteCsvErrorHandler
  )

  router.get('/preview', telegramMiddleware.previewFirstMessage)

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

  router.post(
    '/credentials',
    celebrate(useCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    telegramMiddleware.getCredentialsFromLabel,
    telegramMiddleware.validateAndStoreCredentials,
    telegramMiddleware.setCampaignCredential
  )

  router.post(
    '/credentials/verify',
    celebrate(verifyCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    telegramMiddleware.getCampaignCredential,
    telegramMiddleware.sendValidationMessage
  )

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

  router.get('/stats', TelegramStatsMiddleware.getStats)

  router.post('/refresh-stats', TelegramStatsMiddleware.updateAndGetStats)

  router.get(
    '/export',
    CampaignMiddleware.isCampaignRedacted,
    TelegramStatsMiddleware.getDeliveredRecipients
  )

  router.post(
    '/duplicate',
    celebrate(duplicateCampaignValidator),
    telegramMiddleware.duplicateCampaign
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
