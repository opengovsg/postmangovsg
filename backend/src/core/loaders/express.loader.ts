import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'

import v1Router from '@core/routes'

const expressApp = ({ app }: { app: express.Application }): void => {
  app.use(bodyParser.json())
  app.get('/', async (_req: Request, res: Response) => {
    res.sendStatus(200)
  })
  app.use('/api/v1', v1Router)
}

export default expressApp