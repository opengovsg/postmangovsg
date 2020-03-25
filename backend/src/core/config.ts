import fs from 'fs'
import path from 'path'

const databaseUri: string = process.env.DB_URI as string

const IS_PROD: boolean = process.env.NODE_ENV === 'production'
const SEQUELIZE_POOL_MAX_CONNECTIONS = 150
const SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS = 600000

const rdsCa = IS_PROD && fs.readFileSync(path.join(__dirname, '../db-ca.pem'))

export default {
  IS_PROD,
  database: {
    databaseUri,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: true,
        ca: [rdsCa]
      }
    },
    poolOptions: {
      max: SEQUELIZE_POOL_MAX_CONNECTIONS,
      min: 0,
      acquire: SEQUELIZE_POOL_ACQUIRE_IN_MILLISECONDS, // 10 min
    },
  }
}