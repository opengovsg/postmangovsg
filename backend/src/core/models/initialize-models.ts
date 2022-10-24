import {
  Agency,
  Campaign,
  Credential,
  Domain,
  JobQueue,
  List,
  ProtectedMessage,
  Statistic,
  Unsubscriber,
  User,
  UserCredential,
  UserDemo,
  UserFeature,
  UserList,
  Worker,
} from '@core/models'
import {
  EmailBlacklist,
  EmailFromAddress,
  EmailMessage,
  EmailMessageTransactional,
  EmailOp,
  EmailTemplate,
} from '@email/models'
import { SmsMessage, SmsOp, SmsTemplate } from '@sms/models'
import {
  BotSubscriber,
  TelegramMessage,
  TelegramOp,
  TelegramSubscriber,
  TelegramTemplate,
} from '@telegram/models'
import { Sequelize } from 'sequelize-typescript'

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
    List,
    UserList,
  ]
  const emailModels = [
    EmailBlacklist,
    EmailFromAddress,
    EmailMessage,
    EmailMessageTransactional,
    EmailOp,
    EmailTemplate,
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
}

export default initializeModels
