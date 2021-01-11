import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import sessionLoader from '@core/loaders/session.loader'
import { errors as celebrateErrorMiddleware } from 'celebrate'
import routes from '@core/routes'

const unAuthenticatedRoutes = ['auth', 'stats', 'protect', 'unsubscribe']

const app: express.Application = express()
sessionLoader({ app })
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use((req: Request, _res: Response, next: NextFunction): void => {
  const mainRoute = req.path.split('/')[1]
  // Continue without mocking user session for unauthenticated routes
  if (unAuthenticatedRoutes.indexOf(mainRoute) > -1) {
    return next()
  }
  if (req.session) {
    req.session.user = {
      id: 1,
      email: 'user@agency.gov.sg',
    }
  }
  next()
})
app.use(routes)
app.use(celebrateErrorMiddleware())

export default app
