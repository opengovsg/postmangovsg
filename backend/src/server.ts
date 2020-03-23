import express from 'express'
require('dotenv').config()

import { checkRequiredEnvVars, loaders } from './core'

const requiredEnvVars = ['DB_URI']
const port = Number(process.env.PORT) || 4000
const app: express.Application = express()

const start = async (): Promise<void> => {
  checkRequiredEnvVars(requiredEnvVars)
  await loaders()
  app.listen(port, () => console.log(`Listening on port ${port}!`))
}

start()