import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'

import v1Router from '@core/routes'
import logger from '@core/logger'

const expressApp = ({ app }: { app: express.Application }): void => {
  app.use(bodyParser.json())
  app.get('/', async (_req: Request, res: Response) => {
    res.sendStatus(200)
  })
  app.use('/v1', v1Router)
  logger.info({ message: 'Express routes loaded' })
}

export default expressApp