import { Sequelize, SequelizeOptions } from 'sequelize-typescript'

import config from '../core/config'

// fix PGUSER and PGPASSWORD inside this global test setup to dictate test db
// credentials for surrounding setup like local docker compose or CI containers
process.env.PGUSER = 'postgres'
process.env.PGPASSWORD = 'postgres'
const DB_URI = 'postgres://localhost:5432/postgres'
const TEST_DB = 'postmangovsg_test'
// The number of workers should match the maxWorkers
// defined in  npm test command
const JEST_WORKERS = 2

export const sequelize = new Sequelize(DB_URI, {
  dialect: 'postgres',
  logging: false,
  pool: config.get('database.poolOptions'),
} as SequelizeOptions)

export default async (): Promise<void> => {
  for (let i = 1; i <= JEST_WORKERS; i++) {
    await sequelize.query(`DROP DATABASE IF EXISTS ${TEST_DB}_${i}`)
    await sequelize.query(`CREATE DATABASE ${TEST_DB}_${i}`)
  }
}
