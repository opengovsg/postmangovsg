import cors from 'cors'
import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import { errors as celebrateErrorMiddleware } from 'celebrate'
import morgan from 'morgan'
import * as Sentry from '@sentry/node'

import config from '@core/config'
import v1Router from '@core/routes'
import { createCustomLogger, setRequestMetadata } from '@core/utils/logger'
import { clientIp, userId } from '@core/utils/morgan'

const logger = createCustomLogger(module)
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

morgan.token('client-ip', clientIp)
morgan.token('user-id', userId)
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
const loggerMiddleware = morgan(config.get('MORGAN_LOG_FORMAT'), {
  stream: logger.stream,
})

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

const loggerMetadataMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  setRequestMetadata(req, _res)
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
  app.use(loggerMiddleware)
  app.use(loggerMetadataMiddleware)

  app.use(overrideContentTypeHeaderMiddleware)
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))
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

  app.get('/', async (_req: Request, res: Response) => {
    return res.sendStatus(200)
  })

  app.use(sentrySessionMiddleware)

  app.use('/v1', v1Router)
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
        error: err,
        // ...getRequestMetadata(_req, res),
      })
      return res.sendStatus(500)
    }
  )

  logger.info({ message: 'Express routes loaded' })
}

export default expressApp
