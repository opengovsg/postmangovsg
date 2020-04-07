import express from 'express'
require('dotenv').config()
require('module-alias/register')

import { checkRequiredEnvVars, loaders } from './core'

const requiredEnvVars = ['DB_URI']
const app: express.Application = express()

const getApp = async () => {
  checkRequiredEnvVars(requiredEnvVars)
  await loaders({ app })
  return app
}

export default getApp