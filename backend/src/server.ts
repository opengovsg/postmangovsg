import express from 'express'
require('dotenv').config()
require('module-alias/register')

import { checkRequiredEnvVars, loaders } from './core'

const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_REGION',
  'AWS_SECRET_ACCESS_KEY',
  'DB_URI',
  'FILE_STORAGE_BUCKET_NAME',
  'SESSION_SECRET',
]

const port = Number(process.env.PORT) || 4000
const app: express.Application = express()

const start = async (): Promise<void> => {
  checkRequiredEnvVars(requiredEnvVars)
  await loaders({ app })
  app.listen(port, () => console.log(`Listening on port ${port}!`))
}

start()
  .catch((err) => {
    console.error(err)
  })