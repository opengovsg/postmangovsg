import express from 'express'
import bodyParser from 'body-parser'
import v1Router from '../routes'

const expressApp = ({ app }: {app: express.Application}): void => {
  app.use(bodyParser.json())
  app.use('/v1', v1Router)
}

export default expressApp