import '../setup'

import { dbConfig } from './util'

const commonConfig = {
  dialect: 'postgres',
  seederStorage: 'sequelize',
  ...dbConfig,
}

module.exports = {
  development: commonConfig,
  staging: commonConfig,
  production: commonConfig,
}
