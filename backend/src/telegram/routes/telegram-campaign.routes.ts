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
      scheduledTiming: Joi.string().optional(),
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
    telegramMiddleware.validateCredentials,
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
  return router
}
