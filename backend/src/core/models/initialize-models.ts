import { Sequelize } from 'sequelize-typescript'
import {
  Agency,
  ApiKey,
  Campaign,
  Credential,
  Domain,
  JobQueue,
  ProtectedMessage,
  Statistic,
  Unsubscriber,
  User,
  UserCredential,
  UserDemo,
  UserFeature,
  Worker,
} from '@core/models'
import {
  CommonAttachment,
  EmailBlacklist,
  EmailFromAddress,
  EmailMessage,
  EmailMessageTransactional,
  EmailOp,
  EmailTemplate,
  EmailMessageTransactionalCc,
} from '@email/models'
import {
  SmsMessage,
  SmsMessageTransactional,
  SmsOp,
  SmsTemplate,
} from '@sms/models'
import {
  BotSubscriber,
  TelegramMessage,
  TelegramOp,
  TelegramSubscriber,
  TelegramTemplate,
} from '@telegram/models'

export const initializeModels = (sequelize: Sequelize): void => {
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
    Agency,
    Domain,
    ApiKey,
  ]
  const emailModels = [
    EmailBlacklist,
    EmailFromAddress,
    EmailMessage,
    EmailMessageTransactional,
    EmailMessageTransactionalCc,
    EmailOp,
    EmailTemplate,
    ProtectedMessage,
    CommonAttachment,
  ]
  const smsModels = [SmsMessage, SmsMessageTransactional, SmsTemplate, SmsOp]
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
}

export default initializeModels
