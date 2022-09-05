import express, { Request, Response, NextFunction } from 'express'
import { errors as celebrateErrorMiddleware } from 'celebrate'
import sessionLoader from '@core/loaders/session.loader'
import { InitV1Route } from '@core/routes'
import {
  InitAuthService,
  InitCredentialService,
  RedisService,
} from '@core/services'

const initialiseServer = (session?: boolean): express.Application => {
  const app: express.Application = express()
  const redisService = new RedisService()
  ;(app as any).redisService = redisService
  ;(app as any).authService = InitAuthService(redisService)
  ;(app as any).credentialService = InitCredentialService(redisService)
  sessionLoader({ app })
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

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
