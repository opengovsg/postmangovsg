require('dotenv').config()
require('module-alias/register')

/** SENSITIVE CONFIGURATION **/
const missingEnvVars = [
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
].reduce(function (acc: string[], name: string){
  if (process.env[name] === undefined) acc.push(name)
  return acc
},[])

if (missingEnvVars.length>0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars}`)
}

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