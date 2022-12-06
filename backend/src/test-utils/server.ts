import express, { Request, Response, NextFunction } from 'express'
import { errors as celebrateErrorMiddleware } from 'celebrate'
import sessionLoader from '@core/loaders/session.loader'
import { InitV1Route } from '@core/routes'
import {
  InitAuthService,
  InitCredentialService,
  RedisService,
} from '@core/services'
import config from '@core/config'

const initialiseServer = (session?: boolean): express.Application => {
  const app: express.Application = express()
  const redisService = new RedisService()
  ;(app as any).redisService = redisService
  ;(app as any).authService = InitAuthService(redisService)
  ;(app as any).credentialService = InitCredentialService(redisService)
  sessionLoader({ app })
  app.use(
    express.json({
      // this must be bigger than transactionalEmail.bodySizeLimit so that users who exceed limit
      // will get 404 error informing them of the size of the limit, instead of 500 error
      limit: config.get('transactionalEmail.bodySizeLimit') * 10,
    })
  )
  app.use(
    express.urlencoded({
      extended: false,
      // this must be significantly bigger than transactionalEmail.bodySizeLimit so that users who exceed limit
      // will get 400 error informing them of the size of the limit, instead of 500 error
      limit: config.get('transactionalEmail.bodySizeLimit') * 10,
    })
  )

  app.use((req: Request, _res: Response, next: NextFunction): void => {
    if (session && req.session) {
      req.session.user = {
        id: 1,
        email: 'user@agency.gov.sg',
      }
    }
    next()
  })

  const routes = InitV1Route(app)
  app.use(routes)
  app.use(celebrateErrorMiddleware())
  ;(app as any).cleanup = async function (): Promise<void> {
    await (app as any).redisService.shutdown()
  }

  return app
}

export default initialiseServer
