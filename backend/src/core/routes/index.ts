import { Router } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { Request, Response } from 'express'
import { ChannelType } from '@core/constants'
import { Campaign } from '@core/models'
import { canEditCampaign } from '@core/middlewares'
import { isCookieAuthenticated } from '@core/middlewares'

// Core routes
import authenticationRoutes from './auth.routes'
import campaignRoutes from './campaign.routes'

// Import channel-specific routes
import smsRoutes from '@sms/routes'
import emailRoutes from '@email/routes'

const CHANNEL_ROUTES = Object.values(ChannelType).map(route => `/${route.toLowerCase()}`)

const campaignIdValidator = {
  [Segments.PARAMS]: Joi.object({
    campaignId: Joi
      .number()
      .integer()
      .positive()
      .required(),
  }),
}

/**
 *  Redirects /campaign/:campaignId to the routes specific to the channel for that campaign
 * @param req 
 * @param res 
 */
const redirectToChannelRoute = async (req: Request, res: Response): Promise<Response | void> => {
  const { baseUrl : campaignUrl, originalUrl } = req
  const resource = originalUrl.substring(campaignUrl.length) // Anything after /campaign/:campaignId
  if(CHANNEL_ROUTES.some(route => resource.startsWith(route))){ 
    // Fall through from missing channel route, which means that the route doesn't exist
    return res.sendStatus(404)
  }

  const { campaignId } = req.params

  const campaign = await Campaign.findOne({ where: { id : +campaignId } , attributes: ['type'] })
  if(!campaign){ // This campaign doesn't exist
    return res.sendStatus(404)
  }

  const redirectTo = `${campaignUrl}/${campaign?.type.toLowerCase()}${resource}`
  return res.redirect(307, redirectTo)
}


const router = Router()

router.use('/auth', authenticationRoutes)
router.use('/campaigns', isCookieAuthenticated, campaignRoutes)
router.use('/campaign/:campaignId/sms', isCookieAuthenticated, celebrate(campaignIdValidator), canEditCampaign, smsRoutes)
router.use('/campaign/:campaignId/email', isCookieAuthenticated, celebrate(campaignIdValidator), canEditCampaign, emailRoutes)
router.use('/campaign/:campaignId', isCookieAuthenticated, celebrate(campaignIdValidator), redirectToChannelRoute)
export default router