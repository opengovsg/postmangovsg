import { Sequelize, SequelizeOptions } from 'sequelize-typescript'

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

import { DefaultCredentialName } from '@core/constants'
import { formatDefaultCredentialName } from '@core/utils'

const DB_TEST_URI = config.get('database.databaseUri')

const sequelizeLoader = async (): Promise<void> => {
  const sequelize = new Sequelize(DB_TEST_URI, {
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
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
    console.log({ message: 'Test Database loaded.' })
  } catch (error) {
    console.log(error.message)
    console.error({ message: 'Unable to connect to test database', error })
    // process.exit(1)
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
