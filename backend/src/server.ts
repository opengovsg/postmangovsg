require('dotenv').config()
require('module-alias/register')

const checkRequiredEnvVars = (vars: Array<string>): boolean => {
  vars.forEach(v => {
    if (!process.env[v]) {
      // do not use winston logger here since we may require certain env vars for logger in the future
      // eslint-disable-next-line no-console
      console.log(`${v} environment variable is not set!`)
      throw new Error(`${v} environment variable is not set!`)
    }
  })
  return true
}

/** SENSITIVE CONFIGURATION **/
const requiredEnvVars = [
  // Database settings
  'DB_URI',
  // Cache settings
  'REDIS_OTP_URI',
  'REDIS_SESSION_URI',
  // Express session
  'SESSION_SECRET',
  // AWS Settings
  'SECRET_MANAGER_SALT',
  // Upload csv
  'JWT_SECRET',
  // For API Key hashing 
  'API_KEY_SALT_V1',
]

checkRequiredEnvVars(requiredEnvVars)

/** Load the app after we make sure that the sensitive env vars exist */
import 'source-map-support/register'
import express from 'express'
import { loaders } from '@core/loaders'
const port = Number(process.env.PORT) || 4000
const app: express.Application = express()

const start = async (): Promise<void> => {
  await loaders({ app })
  // eslint-disable-next-line no-console
  app.listen(port, () => console.log(`Listening on port ${port}!`))
}

start()
  .catch((err) => {
    console.error(err)
  })