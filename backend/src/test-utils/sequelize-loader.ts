import path from 'path'
import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import Umzug from 'umzug'

import config from '@core/config'
import { initializeModels } from '@core/models'

const DB_TEST_URI = config.get('database.databaseUri')

const sequelizeLoader = async (dbName: string): Promise<Sequelize> => {
  const sequelize = new Sequelize(`${DB_TEST_URI}_${dbName}`, {
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
  } as SequelizeOptions)

  try {
    await sequelize.authenticate()
    console.log({ message: 'Test Database loaded.' })
  } catch (error) {
    console.log(error.message)
    console.error({ message: 'Unable to connect to test database', error })
    process.exit(1)
  }

  const umzugMigrator = new Umzug({
    migrations: {
      path: path.resolve(__dirname, '../database/migrations'),
      params: [sequelize.getQueryInterface(), sequelize.constructor],
    },
    storage: 'sequelize',
    storageOptions: {
      sequelize,
    },
  })
  const umzugSeeder = new Umzug({
    migrations: {
      path: path.resolve(__dirname, '../database/seeders'),
      params: [sequelize.getQueryInterface(), sequelize.constructor],
    },
    storage: 'sequelize',
    storageOptions: {
      sequelize,
      modelName: 'SequelizeData',
    },
  })

  try {
    await umzugMigrator.up()
    await umzugSeeder.up()
    console.log({ message: 'Test database migrated and seeded.' })
  } catch (error) {
    console.log(error)
    console.error({
      message: 'Unable to migrate and seed test database',
      error,
    })
    process.exit(1)
  }

  initializeModels(sequelize)

  return sequelize
}

export default sequelizeLoader
