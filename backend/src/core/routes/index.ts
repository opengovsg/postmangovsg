import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { canEditCampaign } from '@core/middlewares'
const campaignIdValidator = {
  [Segments.PARAMS]: Joi.object({
    campaignId: Joi
      .number()
      .integer()
      .positive()
      .required(),
  }),
}

import authenticationRoutes from './auth.routes'
import campaignRoutes from './campaign.routes'
// Import channel-specific routes
import smsRoutes from '@sms/routes'
import emailRoutes from '@email/routes'

const router = Router()

router.use('/auth', authenticationRoutes)
router.use('/campaigns', campaignRoutes)
router.use('/campaign/:campaignId/sms', celebrate(campaignIdValidator), canEditCampaign, smsRoutes)
router.use('/campaign/:campaignId/email', celebrate(campaignIdValidator), canEditCampaign, emailRoutes)

export default router