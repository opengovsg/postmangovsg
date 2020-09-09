import { Sequelize } from 'sequelize-typescript'

import config from './config'
import { Logger } from './utils/logger'
import { MutableConfig, generateRdsIamAuthToken } from './utils/rds-iam'

const logger = new Logger('db')

const sequelizeLoader = async (): Promise<Sequelize> => {
  const dialectOptions =
    config.get('env') !== 'development'
      ? config.get('database.dialectOptions')
      : {}
  const sequelize = new Sequelize(config.get('database.databaseUri'), {
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
    dialectOptions,
    hooks: {
      beforeConnect: async (dbConfig: MutableConfig): Promise<void> => {
        if (config.get('database.useIam')) {
          dbConfig.password = await generateRdsIamAuthToken(dbConfig)
        }
      },
    },
  })

  await sequelize.authenticate()
  logger.log('Connection established successfully')
  return sequelize
}

export default sequelizeLoader
