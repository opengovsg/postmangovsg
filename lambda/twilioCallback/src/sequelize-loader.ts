import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import config from './config'

const dialectOptions = config.IS_PROD ? { ...config.database.dialectOptions } : {}
const sequelize = new Sequelize(config.database.databaseUri, {
  dialect: 'postgres',
  logging: false,
  pool: config.database.poolOptions,
  ...dialectOptions,
} as SequelizeOptions)

export default sequelize