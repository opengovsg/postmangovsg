import express from 'express'
require('dotenv').config()
require('module-alias/register')

import { checkRequiredEnvVars, loaders } from './core'

const requiredEnvVars = ['DB_URI']

const getApp = async () => {
  checkRequiredEnvVars(requiredEnvVars)
  const app: express.Application = express()
  await loaders({ app })
  return app
}

export default getApp