import { Application } from 'express'

import expressLoader from './loaders/express.loader'
import { sequelizeLoader } from './sequelize'

const checkRequiredEnvVars = (vars: Array<string>): boolean => {
  vars.forEach(v => {
    if (!process.env[v]) {
      console.log(`${v} environment variable is not set!`)
      throw new Error(`${v} environment variable is not set!`)
    }
  })
  return true
}

const loaders = async ({ app }: { app: Application}): Promise<void> => {
  await sequelizeLoader()
  await expressLoader({ app })
}

export { checkRequiredEnvVars, loaders }
export * from './config'