import { parse } from 'pg-connection-string'

const uri = process.env.DB_URI as string
const config = parse(uri)
const commonConfig = {
  dialect: 'postgres',
  seederStorage: 'sequelize',
  migrationStorageTableName: 'sequelize_meta',
  seederStorageTableName: 'sequelize_data',
  ...config,
  username: config.user,
}

module.exports = {
  development: commonConfig,
  staging: commonConfig,
  production: commonConfig,
}
