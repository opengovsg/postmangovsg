import { Sequelize } from 'sequelize-typescript'

import config from '../config'

const DB_URI = config.database.databaseUri

const sequelizeLoader = async (): Promise<Sequelize> => {
  const dialectOptions = config.IS_PROD ? { ...config.database.dialectOptions } : {}
  const sequelize = new Sequelize(DB_URI, {
    dialect: 'postgres',
    logging: false,
    pool: config.database.poolOptions,
    ...dialectOptions,
  })

  try {
    const synced = sequelize.sync()
    console.log('Database loaded')
    return synced
  } catch (err) {
    console.error(`Unable to connect to database: ${err}`)
    process.exit(1)
  }
}

export default sequelizeLoader