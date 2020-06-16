import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import { parse } from 'pg-connection-string'

import config from '@core/config'
import {
  Credential,
  JobQueue,
  Campaign,
  User,
  Worker,
  UserCredential,
  Statistic,
} from '@core/models'
import {
  EmailMessage,
  EmailTemplate,
  EmailOp,
  EmailBlacklist,
} from '@email/models'
import { SmsMessage, SmsTemplate, SmsOp } from '@sms/models'
import logger from '@core/logger'

const DB_URI = config.get('database.databaseUri')
const DB_READ_REPLICA_URI = config.get('database.databaseReadReplicaUri')

const sequelizeLoader = async (): Promise<void> => {
  const dialectOptions = config.get('IS_PROD')
    ? config.get('database.dialectOptions')
    : {}
  const sequelize = new Sequelize({
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
    replication: {
      read: [parse(DB_READ_REPLICA_URI)],
      write: parse(DB_URI),
    },
    dialectOptions,
  } as SequelizeOptions)

  const coreModels = [
    Credential,
    JobQueue,
    Campaign,
    User,
    Worker,
    UserCredential,
    Statistic,
  ]
  const emailModels = [EmailMessage, EmailTemplate, EmailOp, EmailBlacklist]
  const smsModels = [SmsMessage, SmsTemplate, SmsOp]
  sequelize.addModels([...coreModels, ...emailModels, ...smsModels])

  try {
    await sequelize.sync()
    logger.info({ message: 'Database loaded.' })
  } catch (err) {
    logger.error(`Unable to connect to database: ${err}`)
    process.exit(1)
  }

  await Credential.findCreateFind({ where: { name: 'EMAIL_DEFAULT' } })
}

export default sequelizeLoader
