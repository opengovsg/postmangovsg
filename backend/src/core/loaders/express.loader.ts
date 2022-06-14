import cors from 'cors'
import express, { Request, Response, NextFunction } from 'express'
import { errors as celebrateErrorMiddleware } from 'celebrate'
import * as Sentry from '@sentry/node'
import expressWinston from 'express-winston'

import config from '@core/config'
import { InitV1Route } from '@core/routes'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)
const FRONTEND_URL = config.get('frontendUrl')

/**
 * Returns a regex or a string used by cors to determine if requests comes from allowed origin
 * @param v
 */
const origin = (v: string): string | RegExp => {
  if (v.startsWith('/') && v.endsWith('/')) {
    // Remove the leading and trailing slash
    return new RegExp(v.substring(1, v.length - 1))
  }
  return v
}

const sentrySessionMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.session?.user) {
    Sentry.setUser({ id: req.session?.user?.id })
  }
  if (req.session?.apiKey) {
    Sentry.setTag('usesApiKey', 'true')
  }
  next()
}

Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})

/**
 * SNS defaults the content-type header to 'content-type': 'text/plain; charset=UTF-8',
 * even though it is sending a json document, causing bodyParser to not work
 * @param req
 * @param _res
 * @param next
 */
const overrideContentTypeHeaderMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): Response | void => {
  if (req.get('x-amz-sns-message-type')) {
    req.headers['content-type'] = 'application/json'
  }
  return next()
}

const expressApp = ({ app }: { app: express.Application }): void => {
  app.use(Sentry.Handlers.requestHandler())

  app.use(overrideContentTypeHeaderMiddleware)

  // We need to parse the body as text specifically for SendGrid callbacks.
  // This is to avoid stripping whitespace characters and messing with unicode encoding.
  // This route affects SES callbacks as well, so we'll need to parse the text as JSON
  // in the parseEvent() handle before parsing the SES event.
  app.use('/v1/callback/email', express.text({ type: 'application/json' }))

  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  // ref: https://expressjs.com/en/resources/middleware/cors.html#configuration-options
  // Default CORS setting:
  // {
  //   "origin": "*",
  //   "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  //   "preflightContinue": false,
  //   "optionsSuccessStatus": 204
  // }
  app.use(
    cors({
      origin: origin(FRONTEND_URL),
      credentials: true, // required for setting cookie
    })
  )

  // Prevent browser caching on IE11
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-control', 'no-cache')
    // for HTTP1.0 backward compatibility
    res.setHeader('Pragma', 'no-cache')
    next()
  })

  app.use(
    expressWinston.logger({
      msg: `Incoming HTTP Request {{req.method}} {{req.url}}`,
      winstonInstance: logger,
      ignoredRoutes: ['/'],
      requestWhitelist: ['method', 'url', 'body', 'headers'],
      responseWhitelist: ['body', 'statusCode'],
      // headerBlacklist: ['authorization'],
      metaField: null, // flatten this log to root instead of nesting under `meta`
    })
  )

  app.get('/', async (_req: Request, res: Response) => {
    return res.sendStatus(200)
  })

  app.use(sentrySessionMiddleware)

  app.use('/v1', InitV1Route(app))
  app.use(celebrateErrorMiddleware())
  app.use(Sentry.Handlers.errorHandler())

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logger.error({
        message: 'Unexpected error occured',
        error: `${err.stack}`,
      })
      return res.sendStatus(500)
    }
  )

  logger.info({ message: 'Express routes loaded' })
}

export default expressApp
