import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import config from '@core/config'
import { Credential, initializeModels } from '@core/models'

import { DefaultCredentialName } from '@core/constants'
import { formatDefaultCredentialName } from '@core/utils'

const DB_TEST_URI = config.get('database.databaseUri')

const sequelizeLoader = async (dbName: string): Promise<Sequelize> => {
  const sequelize = new Sequelize(`${DB_TEST_URI}_${dbName}`, {
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
  } as SequelizeOptions)

  initializeModels(sequelize)

  try {
    await sequelize.sync()
    console.log({ message: 'Test Database loaded.' })
  } catch (error) {
    console.log(error.message)
    console.error({ message: 'Unable to connect to test database', error })
    process.exit(1)
  }
  // Create the default credential names in the credentials table
  // Each name should be accompanied by an entry in Secrets Manager
  await Promise.all(
    [
      DefaultCredentialName.Email,
      formatDefaultCredentialName(DefaultCredentialName.SMS),
      formatDefaultCredentialName(DefaultCredentialName.Telegram),
    ].map((name) => Credential.upsert({ name }))
  )

  return sequelize
}

export default sequelizeLoader
