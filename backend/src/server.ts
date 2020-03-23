import express from 'express'
require('dotenv').config()

import { loaders } from './core'

const port = Number(process.env.PORT) || 4000
const app: express.Application = express()
const start = async (): Promise<void> => {
  await loaders()
  app.listen(port, () => console.log(`Listening on port ${port}!`))
}

start()