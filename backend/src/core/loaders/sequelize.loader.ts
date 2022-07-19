import { Sequelize, SequelizeOptions } from 'sequelize-typescript'

import config from '@core/config'
import { initializeModels } from '@core/models'

import { loggerWithLabel } from '@core/logger'
import { MutableConfig, generateRdsIamAuthToken } from '@core/utils/rds-iam'

import { dbConfig as masterConfig, parseDBUri } from '@database/util'

const logger = loggerWithLabel(module)
const DB_READ_REPLICA_URI = config.get('database.databaseReadReplicaUri')

const sequelizeLoader = async (): Promise<void> => {
  const dialectOptions =
    config.get('env') !== 'development'
      ? config.get('database.dialectOptions')
      : {}

  const readReplicaConfig = parseDBUri(DB_READ_REPLICA_URI)

  const sequelize = new Sequelize({
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
    replication: {
      read: [readReplicaConfig],
      write: masterConfig,
    },
    dialectOptions,
    query: {
      useMaster: true,
    },
    retry: {
      max: 5,
      match: [
        /ConnectionError/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /SequelizeConnectionAcquireTimeoutError/,
        /Connection terminated unexpectedly/,
      ],
    },
    hooks: {
      beforeConnect: async (dbConfig: MutableConfig): Promise<void> => {
        if (config.get('database.useIam')) {
          dbConfig.password = await generateRdsIamAuthToken(dbConfig)
        }
      },
    },
  } as SequelizeOptions)

  initializeModels(sequelize)

  try {
    await sequelize.authenticate()
    logger.info({ message: 'Database loaded.' })
  } catch (error) {
    logger.error({ message: 'Unable to connect to database', error })
    process.exit(1)
  }
}

export default sequelizeLoader
