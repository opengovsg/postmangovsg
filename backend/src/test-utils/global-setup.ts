import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import config from '../core/config'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      sequelize: Sequelize
    }
  }
}
const DB_URI = 'postgres://localhost:5432/postgres'
const TEST_DB = 'postmangovsg_test'
// The number of workers should match the maxWorkers
// defined in  npm test command
const JEST_WORKERS = 2

module.exports = async () => {
  global.sequelize = new Sequelize(DB_URI, {
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
  } as SequelizeOptions)

  for (let i = 0; i < JEST_WORKERS; i++) {
    await global.sequelize.query(`DROP DATABASE IF EXISTS ${TEST_DB}_${i}`)
    await global.sequelize.query(`CREATE DATABASE ${TEST_DB}_${i}`)
  }
}
