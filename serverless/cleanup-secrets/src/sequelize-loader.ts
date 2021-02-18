import { Sequelize } from 'sequelize-typescript'
import { parse } from 'pg-connection-string'

import config from './config'
import { Logger } from './utils/logger'
import { MutableConfig, generateRdsIamAuthToken } from './utils/rds-iam'

let sequelize: Sequelize | undefined = undefined

const logger = new Logger('db')

const DB_URI = config.get('database.databaseUri')

const parseDBUri = (uri: string): any => {
  const config = parse(uri)
  return { ...config, username: config.user }
}

const sequelizeLoader = async (): Promise<Sequelize> => {
  const dialectOptions =
    config.get('env') !== 'development'
      ? config.get('database.dialectOptions')
      : {}
  const sequelize = new Sequelize({
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
    ...parseDBUri(DB_URI),
    dialectOptions,
    query: {
      useMaster: true,
    },
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

export const getSequelize = async (): Promise<Sequelize> => {
  if (!sequelize) {
    sequelize = await sequelizeLoader()
  }

  return sequelize
}
