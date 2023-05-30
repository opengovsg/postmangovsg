import { Router } from 'express'
import {
  CampaignSortField,
  ChannelType,
  Ordering,
  CampaignStatus,
} from '@core/constants'
import { celebrate, Joi, Segments } from 'celebrate'
import {
  CampaignMiddleware,
  FileAttachmentMiddleware,
  JobMiddleware,
} from '@core/middlewares'

import config from '@core/config'

const router = Router()

// validators
const listCampaignsValidator = {
  [Segments.QUERY]: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0),
    type: Joi.string().valid(...Object.values(ChannelType)),
    status: Joi.string().valid(...Object.values(CampaignStatus)),
    name: Joi.string().max(255).trim(),
    sort_by: Joi.string().valid(...Object.values(CampaignSortField)),
    order_by: Joi.string().valid(...Object.values(Ordering)),
  }),
}

const createCampaignValidator = {
  [Segments.BODY]: Joi.object({
    type: Joi.string()
      .valid(...Object.values(ChannelType))
      .required(),
    name: Joi.string().max(255).trim().required(),
    protect: Joi.boolean().default(false),
    demo_message_limit: Joi.number().default(null).min(1).max(20),
  }),
}

const deleteCampaignValidator = {
  [Segments.PARAMS]: Joi.object({
    campaignId: Joi.number().required(),
  }),
}

const updateCampaignValidator = {
  [Segments.BODY]: Joi.object({
    name: Joi.string().max(255).trim(),
    should_save_list: Joi.boolean().allow(null),
    // only applicable to email campaigns
    should_bcc_to_me: Joi.boolean().allow(null),
  }),
}

// actual routes here
router.get(
  '/',
  celebrate(listCampaignsValidator),
  CampaignMiddleware.listCampaigns
)

router.post(
  '/',
  celebrate(createCampaignValidator),
  CampaignMiddleware.createCampaign
)

router.delete(
  '/:campaignId',
  celebrate(deleteCampaignValidator),
  CampaignMiddleware.deleteCampaign
)

router.put(
  '/:campaignId',
  celebrate(updateCampaignValidator),
  CampaignMiddleware.updateCampaign
)

router.post('/:campaignId/cancel', JobMiddleware.cancelScheduledCampaign)

router.post(
  '/attachments',
  FileAttachmentMiddleware.getFileUploadHandler(
    config.get('commonAttachments.maxFileSize'),
    // this is necessary as express-fileupload relies on busboy, which has a
    // default field size limit of 1MB and does not throw any error
    // by setting the limit to be 1 byte above the max, any request with
    // a field size exceeding the limit will be truncated to just above the limit
    // which will be caught by Joi validation
    (config.get('transactionalEmail.bodySizeLimit') as number) + 1
  ),
  FileAttachmentMiddleware.transformAttachmentsFieldToArray,
  celebrate({
    [Segments.BODY]: Joi.object({
      attachments: Joi.array().items(Joi.object().keys().required()).required(),
    }),
  }),
  FileAttachmentMiddleware.storeCampaignEmbed
)

export default router
