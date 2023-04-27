import { Router } from 'express'
import { WhatsappMiddleware } from '@whatsapp/middlewares'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  JobMiddleware,
  UploadMiddleware,
} from '@core/middlewares'
import { SmsTemplateMiddleware } from '@sms/middlewares'

export const InitWhatsappCampaignRoute = (
  whatsappMiddleware: WhatsappMiddleware
): Router => {
  const router = Router({ mergeParams: true })
  const useCredentialsValidator = {
    [Segments.BODY]: Joi.object({
      label: Joi.string().required(),
      recipient: Joi.string().trim().required(),
      template: Joi.string().required(),
      // this is part that is different from other campaigns
      // credentials now also include the phone number that the user sends by
      from: Joi.string().required(),
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
  router.use(whatsappMiddleware.isWhatsappCampaignOwnedByUser)
  router.get('/', whatsappMiddleware.getCampaignDetails)
  router.post(
    '/credentials',
    celebrate(useCredentialsValidator),
    CampaignMiddleware.canEditCampaign,
    whatsappMiddleware.getCredentialsFromLabelForCampaign,
    whatsappMiddleware.validateCredentials,
    whatsappMiddleware.setCampaignCredentials
  )

  router.get('/preview', whatsappMiddleware.previewFirstMessage)
  router.post(
    '/send',
    CampaignMiddleware.canEditCampaign,
    CampaignMiddleware.canSendCampaign,
    JobMiddleware.sendCampaign
  )
  router.post('/send-message', whatsappMiddleware.sendMessage)
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

  return router
}
