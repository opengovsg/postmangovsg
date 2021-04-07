import express, { Request, Response, NextFunction } from 'express'
import { errors as celebrateErrorMiddleware } from 'celebrate'
import bodyParser from 'body-parser'
import sessionLoader from '@core/loaders/session.loader'
import routes from '@core/routes'

// const unAuthenticatedRoutes = ['auth', 'stats', 'protect', 'unsubscribe']

const initialiseServer = (session?: boolean): express.Application => {
  const app: express.Application = express()
  sessionLoader({ app })
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))

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
