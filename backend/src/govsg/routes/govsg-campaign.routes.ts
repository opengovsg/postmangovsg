import {
  CampaignMiddleware,
  JobMiddleware,
  UploadMiddleware,
} from '@core/middlewares'
import {
  GovsgMiddleware,
  GovsgStatsMiddleware,
  GovsgTemplateMiddleware,
  GovsgVerificationMiddleware,
} from '@govsg/middlewares'
import { WhatsAppLanguages } from '@shared/clients/whatsapp-client.class/types'
import { Joi, Segments, celebrate } from 'celebrate'
import { Router } from 'express'

const router = Router({ mergeParams: true })

router.use(GovsgMiddleware.isGovsgCampaignOwnedByUser)

router.get('/', GovsgMiddleware.getCampaignDetails)

router.put(
  '/template',
  celebrate({
    [Segments.BODY]: Joi.object({
      template_id: Joi.number().required(),
      for_single_recipient: Joi.boolean().default(false).required(),
    }),
  }),
  CampaignMiddleware.canEditCampaign,
  GovsgTemplateMiddleware.pickTemplateForCampaign
)

router.get(
  '/upload/start',
  celebrate({
    [Segments.QUERY]: Joi.object({
      mime_type: Joi.string().required(),
      md5: Joi.string().required(),
    }),
  }),
  CampaignMiddleware.canEditCampaign,
  UploadMiddleware.uploadStartHandler
)

router.post(
  '/upload/complete',
  celebrate({
    [Segments.BODY]: {
      transaction_id: Joi.string().required(),
      filename: Joi.string().required(),
      etag: Joi.string().required(),
    },
  }),
  CampaignMiddleware.canEditCampaign,
  GovsgTemplateMiddleware.uploadCompleteHandler
)

router.get('/upload/status', GovsgTemplateMiddleware.pollCsvStatusHandler)

router.delete(
  '/upload/status',
  CampaignMiddleware.canEditCampaign,
  GovsgTemplateMiddleware.deleteCsvErrorHandler
)

router.get('/preview', GovsgTemplateMiddleware.previewFirstMessage)

router.post(
  '/send',
  celebrate({
    [Segments.BODY]: {
      // fix rate to 100
      rate: Joi.number().integer().min(100).max(100).default(100),
      scheduledTiming: Joi.date().optional(),
    },
  }),
  CampaignMiddleware.canEditCampaign,
  CampaignMiddleware.canSendCampaign,
  GovsgMiddleware.setDefaultCredentials,
  JobMiddleware.sendCampaign
)

router.post(
  '/send-single',
  celebrate({
    [Segments.BODY]: {
      // fix rate to 100
      rate: Joi.number().integer().min(100).max(100).default(100),
      scheduledTiming: Joi.date().optional(),
      recipient: Joi.string()
        .pattern(/^(\+)?\d*$/)
        .required(),
      language_code: Joi.string()
        .valid(...Object.values(WhatsAppLanguages))
        .default(WhatsAppLanguages.english),
      params: Joi.object().required(),
    },
  }),
  CampaignMiddleware.canEditCampaign,
  CampaignMiddleware.canSendCampaign,
  GovsgMiddleware.processSingleRecipientCampaign,
  GovsgMiddleware.setDefaultCredentials,
  JobMiddleware.sendCampaign
)

router.post(
  '/retry',
  CampaignMiddleware.canEditCampaign,
  JobMiddleware.retryCampaign
)

router.post(
  '/duplicate',
  celebrate({
    [Segments.BODY]: Joi.object({
      name: Joi.string().max(255).trim().required(),
    }),
  }),
  GovsgMiddleware.duplicateCampaign
)

router.get('/stats', GovsgStatsMiddleware.updateAndGetStats)

router.post('/refresh-stats', GovsgStatsMiddleware.updateAndGetStats)

router.get(
  '/export',
  CampaignMiddleware.isCampaignRedacted,
  GovsgStatsMiddleware.getDeliveredRecipients
)

router.get(
  '/messages',
  celebrate({
    [Segments.QUERY]: Joi.object({
      limit: Joi.number().integer().min(1).max(100).default(10),
      offset: Joi.number().integer().min(0).default(0),
      search: Joi.string(),
    }),
  }),
  GovsgVerificationMiddleware.listMessages
)

router.post(
  '/resend',
  celebrate({
    [Segments.BODY]: {
      govsg_message_id: Joi.string().required(),
    },
  }),
  GovsgVerificationMiddleware.resendMessage
)

export default router
