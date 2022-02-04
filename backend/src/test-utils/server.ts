import express, { Request, Response, NextFunction } from 'express'
import { errors as celebrateErrorMiddleware } from 'celebrate'
import sessionLoader from '@core/loaders/session.loader'
import routes from '@core/routes'

const initialiseServer = (session?: boolean): express.Application => {
  const app: express.Application = express()
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

  app.use(routes)
  app.use(celebrateErrorMiddleware())

  return app
}

export default initialiseServer
