require('dotenv').config()
require('module-alias/register')

const alertIfMissing = (envVars: string[], throwError = true): void => {
  const missingEnvVars = envVars.reduce(function (acc: string[], name: string){
    if (process.env[name] === undefined) acc.push(name)
    return acc
  },[])

  if (missingEnvVars.length>0) {
    if (throwError) {
      throw new Error(`Missing required environment variables: ${missingEnvVars}`)
    }
    else {
      console.warn(`Missing required environment variables: ${missingEnvVars}`)
    }
  }
}


const envVars = [
  // Database settings
  'DB_URI',
  // AWS settings
  'SECRET_MANAGER_SALT',
  // ECS
  'ECS_SERVICE_NAME',
  // Message workers
  'MESSAGE_WORKER_SENDER',
  'MESSAGE_WORKER_LOGGER',
]
alertIfMissing(envVars)

const senderEnvVars = [
  'SES_HOST',
  'SES_USER',
  'SES_PASS',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_API_KEY',
  'TWILIO_API_SECRET',
  'TWILIO_MESSAGING_SERVICE_SID',
]
if (parseInt(process.env.MESSAGE_WORKER_SENDER as string) > 0){
  alertIfMissing(senderEnvVars, false)
}

/** Load the app after we make sure that the sensitive env vars exist */
import 'source-map-support/register'
import { loaders } from '@core/loaders'
const start = async (): Promise<void> => {
  await loaders()
}

start()
  .catch((err) => {
    console.error(err)
  })