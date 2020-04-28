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
  'FRONTEND_URL',
  'COOKIE_DOMAIN',
]

const getApp = async () => {
  checkRequiredEnvVars(requiredEnvVars)
  const app: express.Application = express()
  await loaders({ app })
  return app
}

export default getApp