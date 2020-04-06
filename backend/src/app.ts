import express from 'express'
require('dotenv').config()
require('module-alias/register')

import { checkRequiredEnvVars, loaders } from './core'

const requiredEnvVars = ['DB_URI']
const app: express.Application = express()

checkRequiredEnvVars(requiredEnvVars)
loaders({ app })

export default app