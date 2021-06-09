import '../setup'

import { dbConfig } from './util'

const commonConfig = {
  dialect: 'postgres',
  seederStorage: 'sequelize',
  migrationStorageTableName: 'sequelize_meta',
  seederStorageTableName: 'sequelize_data',
  ...dbConfig,
}

module.exports = {
  development: commonConfig,
  staging: commonConfig,
  production: commonConfig,
}
