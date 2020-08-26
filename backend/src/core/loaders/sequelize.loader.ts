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
  ProtectedMessage,
  Unsubscriber,
} from '@core/models'
import {
  EmailMessage,
  EmailTemplate,
  EmailOp,
  EmailBlacklist,
} from '@email/models'
import { SmsMessage, SmsTemplate, SmsOp } from '@sms/models'
import {
  BotSubscriber,
  TelegramMessage,
  TelegramOp,
  TelegramSubscriber,
  TelegramTemplate,
} from '@telegram/models'

import logger from '@core/logger'

function parseDBUri(uri: string): any {
  const config = parse(uri)
  return { ...config, username: config.user }
}

const sequelizeLoader = async (): Promise<void> => {
  const DB_URI = config.get('database.databaseUri')
  const DB_READ_REPLICA_URI = config.get('database.databaseReadReplicaUri')

  const dialectOptions = config.get('IS_PROD')
    ? config.get('database.dialectOptions')
    : {}
  const sequelize = new Sequelize({
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
    replication: {
      read: [parseDBUri(DB_READ_REPLICA_URI)],
      write: parseDBUri(DB_URI),
    },
    dialectOptions,
    query: {
      useMaster: true,
    },
  } as SequelizeOptions)

  const coreModels = [
    Credential,
    JobQueue,
    Campaign,
    User,
    Worker,
    UserCredential,
    Statistic,
    Unsubscriber,
  ]
  const emailModels = [
    EmailMessage,
    EmailTemplate,
    EmailOp,
    EmailBlacklist,
    ProtectedMessage,
  ]
  const smsModels = [SmsMessage, SmsTemplate, SmsOp]
  const telegramModels = [
    BotSubscriber,
    TelegramOp,
    TelegramMessage,
    TelegramTemplate,
    TelegramSubscriber,
  ]
  sequelize.addModels([
    ...coreModels,
    ...emailModels,
    ...smsModels,
    ...telegramModels,
  ])

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
