import 'source-map-support/register'
require('dotenv').config()
require('module-alias/register')

import { checkRequiredEnvVars, loaders } from './core'

const requiredEnvVars = [
  'AWS_REGION',
  'SECRET_MANAGER_SALT',
  'DB_URI',
]

const start = async (): Promise<void> => {
  checkRequiredEnvVars(requiredEnvVars)
  await loaders()
}

start()
  .catch((err) => {
    console.error(err)
  })