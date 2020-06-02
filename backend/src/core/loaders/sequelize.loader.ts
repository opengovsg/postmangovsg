import { Sequelize } from 'sequelize-typescript'

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
import { EmailMessage, EmailTemplate, EmailOp } from '@email/models'
import { SmsMessage, SmsTemplate, SmsOp } from '@sms/models'
import {
  BotSubscriber,
  TelegramMessage,
  TelegramOp,
  TelegramSubscriber,
  TelegramTemplate,
} from '@telegram/models'

import logger from '@core/logger'

const DB_URI = config.get('database.databaseUri')

const sequelizeLoader = async (): Promise<void> => {
  const dialectOptions = config.get('IS_PROD')
    ? config.get('database.dialectOptions')
    : {}
  const sequelize = new Sequelize(DB_URI, {
    dialect: 'postgres',
    logging: false,
    pool: config.get('database.poolOptions'),
    dialectOptions,
  })

  const coreModels = [
    Credential,
    JobQueue,
    Campaign,
    User,
    Worker,
    UserCredential,
    Statistic,
  ]
  const emailModels = [EmailMessage, EmailTemplate, EmailOp]
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
