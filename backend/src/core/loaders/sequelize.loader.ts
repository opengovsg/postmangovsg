import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import { parse } from 'pg-connection-string'

import config from '@core/config'
import {
  Credential,
  JobQueue,
  Campaign,
  Worker,
  User,
  UserFeature,
  UserCredential,
  UserDemo,
  Statistic,
  ProtectedMessage,
  Unsubscriber,
} from '@core/models'
import {
  EmailMessage,
  EmailTemplate,
  EmailOp,
  EmailBlacklist,
  EmailFromAddress,
} from '@email/models'
import { SmsMessage, SmsTemplate, SmsOp } from '@sms/models'
import {
  BotSubscriber,
  TelegramMessage,
  TelegramOp,
  TelegramSubscriber,
  TelegramTemplate,
} from '@telegram/models'

import { loggerWithLabel } from '@core/logger'
import { MutableConfig, generateRdsIamAuthToken } from '@core/utils/rds-iam'
import { DefaultCredentialName } from '@core/constants'
import { formatDefaultCredentialName } from '@core/utils'

const logger = loggerWithLabel(module)
const DB_URI = config.get('database.databaseUri')
const DB_READ_REPLICA_URI = config.get('database.databaseReadReplicaUri')

const parseDBUri = (uri: string): any => {
  const config = parse(uri)
  return { ...config, username: config.user }
}

const sequelizeLoader = async (): Promise<void> => {
  const dialectOptions =
    config.get('env') !== 'development'
      ? config.get('database.dialectOptions')
      : {}

  const masterConfig = parseDBUri(DB_URI)
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
    hooks: {
      beforeConnect: async (dbConfig: MutableConfig): Promise<void> => {
        if (config.get('database.useIam')) {
          dbConfig.password = await generateRdsIamAuthToken(dbConfig)
        }
      },
    },
  } as SequelizeOptions)

  const coreModels = [
    Credential,
    JobQueue,
    Campaign,
    Worker,
    User,
    UserFeature,
    UserCredential,
    UserDemo,
    Statistic,
    Unsubscriber,
  ]
  const emailModels = [
    EmailMessage,
    EmailTemplate,
    EmailOp,
    EmailBlacklist,
    ProtectedMessage,
    EmailFromAddress,
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
  } catch (error) {
    logger.error({ message: 'Unable to connect to database', error })
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
}

export default sequelizeLoader
