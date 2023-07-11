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
    smsMiddleware.getCredentialsFromLabelCampaign,
    smsMiddleware.validateAndStoreCredentials,
    smsMiddleware.setCampaignCredential
  )

  router.get('/preview', smsMiddleware.previewFirstMessage)

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

  return router
}
