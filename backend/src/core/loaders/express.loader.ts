import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import morgan from 'morgan'

import config from '@core/config'
import v1Router from '@core/routes'
import logger from '@core/logger'

const loggerMiddleware = morgan(config.MORGAN_LOG_FORMAT)

const expressApp = ({ app }: { app: express.Application }): void => {
  app.use(loggerMiddleware)

  app.use(bodyParser.json())

  app.get('/', async (_req: Request, res: Response) => {
    return res.sendStatus(200)
  })

  app.use('/v1', v1Router)
 
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(`${err}`)
    return res.sendStatus(500)
  })
  
  logger.info({ message: 'Express routes loaded' })
}

export default expressApp