import 'source-map-support/register'

import express from 'express'
require('dotenv').config()
require('module-alias/register')

import { checkRequiredEnvVars, loaders } from './core'

const requiredEnvVars = [
  'AWS_REGION',
  'FILE_STORAGE_BUCKET_NAME',
  'SECRET_MANAGER_SALT',
  'JWT_SECRET',
  'DB_URI',
  'REDIS_OTP_URI',
  'REDIS_SESSION_URI',
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