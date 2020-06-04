import { Router, Request, Response, NextFunction } from 'express'
import { celebrate, Joi, Segments } from 'celebrate'
import { ChannelType } from '@core/constants'
import { Campaign } from '@core/models'
import { AuthMiddleware } from '@core/middlewares'

// Core routes
import authenticationRoutes from './auth.routes'
import campaignRoutes from './campaign.routes'
import settingsRoutes from './settings.routes'
import statsRoutes from './stats.routes'

// Import channel-specific routes
import { smsCampaignRoutes, smsSettingsRoutes } from '@sms/routes'
import { emailCampaignRoutes, emailSettingsRoutes } from '@email/routes'

const CHANNEL_ROUTES = Object.values(ChannelType).map(
  (route) => `/${route.toLowerCase()}`
)

const campaignIdValidator = {
  [Segments.PARAMS]: Joi.object({
    campaignId: Joi.number().integer().positive().required(),
  }),
}

/**
 *  Redirects /campaign/:campaignId to the routes specific to the channel for that campaign
 * @param req
 * @param res
 */
const redirectToChannelRoute = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { baseUrl: campaignUrl, originalUrl } = req
  const resource = originalUrl.substring(campaignUrl.length) // Anything after /campaign/:campaignId
  if (CHANNEL_ROUTES.some((route) => resource.startsWith(route))) {
    // Fall through from missing channel route, which means that the route doesn't exist
    return res.sendStatus(404)
  }

  const { campaignId } = req.params

  const campaign = await Campaign.findOne({
    where: { id: +campaignId },
    attributes: ['type'],
  })
  if (!campaign) {
    // This campaign doesn't exist
    return res.sendStatus(404)
  }

  const redirectTo = `${campaignUrl}/${campaign?.type.toLowerCase()}${resource}`
  return res.redirect(307, redirectTo)
}

/**
 * Healthcheck endpoint that connects to the db
 * @param _req
 * @param res
 * @param next
 */
const ping = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    await Campaign.sequelize?.query('SELECT 1+1;')
    return res.sendStatus(200)
  } catch (err) {
    return next(err)
  }
}

const router = Router()
router.use('/ping', ping)
router.use('/auth', authenticationRoutes)
router.use('/stats', statsRoutes)

router.use(
  '/campaigns',
  AuthMiddleware.isCookieOrApiKeyAuthenticated,
  campaignRoutes
)
router.use(
  '/campaign/:campaignId/sms',
  AuthMiddleware.isCookieOrApiKeyAuthenticated,
  celebrate(campaignIdValidator),
  smsCampaignRoutes
)
router.use(
  '/campaign/:campaignId/email',
  AuthMiddleware.isCookieOrApiKeyAuthenticated,
  celebrate(campaignIdValidator),
  emailCampaignRoutes
)
router.use(
  '/campaign/:campaignId',
  AuthMiddleware.isCookieOrApiKeyAuthenticated,
  celebrate(campaignIdValidator),
  redirectToChannelRoute
)

router.use(
  '/settings/email',
  AuthMiddleware.isCookieOrApiKeyAuthenticated,
  emailSettingsRoutes
)
router.use(
  '/settings/sms',
  AuthMiddleware.isCookieOrApiKeyAuthenticated,
  smsSettingsRoutes
)
router.use(
  '/settings',
  AuthMiddleware.isCookieOrApiKeyAuthenticated,
  settingsRoutes
)

export default router
