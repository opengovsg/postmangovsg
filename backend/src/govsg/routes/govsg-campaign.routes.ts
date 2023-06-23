import {
  CampaignMiddleware,
  JobMiddleware,
  UploadMiddleware,
} from '@core/middlewares'
import { GovsgMiddleware, GovsgTemplateMiddleware } from '@govsg/middlewares'
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

export default router
