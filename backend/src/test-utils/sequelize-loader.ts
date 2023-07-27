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

  initializeModels(sequelize)

  try {
    // There isn't a reason to test migrations, so just use sync() here.
    await sequelize.sync()
    // eslint-disable-next-line no-console
    console.log({ message: 'Test Database loaded.' })
  } catch (error) {
    console.log(error)
    // eslint-disable-next-line no-console
    console.log((error as Error).message)
    console.error({ message: 'Unable to connect to test database', error })
    // process.exit(1)
  }

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
    await umzugSeeder.up()
    // eslint-disable-next-line no-console
    console.log({ message: 'Test database seeded.' })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    console.error({
      message: 'Unable to seed test database',
      error,
    })
    process.exit(1)
  }

  return sequelize
}

export default sequelizeLoader
