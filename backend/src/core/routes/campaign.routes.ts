import { Router } from 'express'
import {
  CampaignSortField,
  CampaignStatus,
  ChannelType,
  Ordering,
} from '@core/constants'
import { celebrate, Joi, Segments } from 'celebrate'
import { CampaignMiddleware, JobMiddleware } from '@core/middlewares'

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
  CampaignMiddleware.isCampaignOwnedByUser,
  CampaignMiddleware.deleteCampaign
)

router.put(
  '/:campaignId',
  celebrate(updateCampaignValidator),
  CampaignMiddleware.isCampaignOwnedByUser,
  CampaignMiddleware.updateCampaign
)

router.post('/:campaignId/cancel', JobMiddleware.cancelScheduledCampaign)

export default router
