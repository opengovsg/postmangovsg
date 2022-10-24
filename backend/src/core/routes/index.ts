import { ChannelType } from '@core/constants'
import { loggerWithLabel } from '@core/logger'
import { InitAuthMiddleware, InitSettingsMiddleware } from '@core/middlewares'
import { Campaign } from '@core/models'
import {
  InitEmailMiddleware,
  InitEmailTemplateMiddleware,
  InitEmailTransactionalMiddleware,
} from '@email/middlewares'
import {
  emailCallbackRoutes,
  InitEmailCampaignRoute,
  InitEmailSettingsRoute,
  InitEmailTransactionalRoute,
} from '@email/routes'
import { InitSmsMiddleware } from '@sms/middlewares'
// Import channel-specific routes
import {
  InitSmsCampaignRoute,
  InitSmsSettingsRoute,
  InitSmsTransactionalRoute,
  smsCallbackRoutes,
} from '@sms/routes'
import { InitTelegramMiddleware } from '@telegram/middlewares'
import {
  InitTelegramCampaignMiddleware,
  InitTelegramSettingsRoute,
  telegramCallbackRoutes,
} from '@telegram/routes'
import { celebrate, Joi, Segments } from 'celebrate'
import { Application, NextFunction, Request, Response, Router } from 'express'

// Core routes
import { InitAuthRoutes } from './auth.routes'
import campaignRoutes from './campaign.routes'
import listRoutes from './list.routes'
import protectedMailRoutes from './protected.routes'
import { InitSettingsRoute } from './settings.routes'
import statsRoutes from './stats.routes'
import unsubscriberRoutes from './unsubscriber.routes'

export const InitV1Route = (app: Application): Router => {
  const logger = loggerWithLabel(module)
  const authMiddleware = InitAuthMiddleware((app as any).authService)
  const authenticationRoutes = InitAuthRoutes(authMiddleware)
  const settingsMiddleware = InitSettingsMiddleware(
    (app as any).credentialService
  )
  const settingsRoutes = InitSettingsRoute(settingsMiddleware)
  const smsMiddleware = InitSmsMiddleware((app as any).credentialService)
  const smsCampaignRoutes = InitSmsCampaignRoute(
    smsMiddleware,
    settingsMiddleware
  )
  const smsSettingsRoutes = InitSmsSettingsRoute(
    smsMiddleware,
    settingsMiddleware
  )
  const smsTransactionalRoutes = InitSmsTransactionalRoute(smsMiddleware)
  const emailTemplateMiddleware = InitEmailTemplateMiddleware(
    (app as any).authService
  )
  const emailMiddleware = InitEmailMiddleware((app as any).authService)
  const emailCampaignRoutes = InitEmailCampaignRoute(
    emailTemplateMiddleware,
    emailMiddleware
  )
  const emailTransactionalMiddleware = InitEmailTransactionalMiddleware(
    (app as any).redisService,
    (app as any).authService
  )
  const emailTransactionalRoutes = InitEmailTransactionalRoute(
    emailTransactionalMiddleware,
    emailMiddleware
  )
  const emailSettingsRoutes = InitEmailSettingsRoute(emailMiddleware)
  const telegramMiddleware = InitTelegramMiddleware(
    (app as any).credentialService
  )
  const telegramCampaignRoutes = InitTelegramCampaignMiddleware(
    settingsMiddleware,
    telegramMiddleware
  )
  const telegramSettingsRoutes = InitTelegramSettingsRoute(
    telegramMiddleware,
    settingsMiddleware
  )

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
      logger.error({
        message: 'Channel does not exist',
        originalUrl,
        action: 'redirectToChannelRoute',
      })
      return res.sendStatus(404)
    }

    const { campaignId } = req.params

    const campaign = await Campaign.findOne({
      where: { id: +campaignId },
      attributes: ['type'],
    })
    if (!campaign) {
      // This campaign doesn't exist
      logger.error({
        message: 'Campaign does not exist',
        campaignId,
        action: 'redirectToChannelRoute',
      })
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
  router.use('/protect', protectedMailRoutes)
  router.use('/unsubscribe', unsubscriberRoutes)
  router.use('/lists', listRoutes)

  /**
   * @swagger
   * components:
   *   securitySchemes:
   *     bearerAuth:
   *       type: http
   *       scheme: bearer
   *     cookieAuth:
   *       type: apiKey
   *       in: cookie
   *       name: postmangovsg
   */

  router.use(
    '/campaigns',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    campaignRoutes
  )
  router.use(
    '/campaign/:campaignId/sms',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    celebrate(campaignIdValidator),
    smsCampaignRoutes
  )
  router.use(
    '/campaign/:campaignId/email',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    celebrate(campaignIdValidator),
    emailCampaignRoutes
  )
  router.use(
    '/campaign/:campaignId/telegram',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    celebrate(campaignIdValidator),
    telegramCampaignRoutes
  )
  router.use(
    '/campaign/:campaignId',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    celebrate(campaignIdValidator),
    redirectToChannelRoute
  )

  router.use(
    '/settings/email',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    emailSettingsRoutes
  )
  router.use(
    '/settings/sms',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    smsSettingsRoutes
  )
  router.use(
    '/settings/telegram',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    telegramSettingsRoutes
  )
  router.use(
    '/settings',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    settingsRoutes
  )

  router.use(
    '/transactional/sms',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    smsTransactionalRoutes
  )

  router.use(
    '/transactional/email',
    authMiddleware.isCookieOrApiKeyAuthenticated,
    emailTransactionalRoutes
  )

  router.use('/callback/email', emailCallbackRoutes)

  router.use('/callback/sms', smsCallbackRoutes)

  router.use('/callback/telegram', telegramCallbackRoutes)
  return router
}
