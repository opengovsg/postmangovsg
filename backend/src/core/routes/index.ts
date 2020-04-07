import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { verifyCampaignOwner } from '@core/middlewares'
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
router.use('/campaign/:campaignId/sms', celebrate(campaignIdValidator), verifyCampaignOwner, smsRoutes)
router.use('/campaign/:campaignId/email', celebrate(campaignIdValidator), verifyCampaignOwner, emailRoutes)

export default router