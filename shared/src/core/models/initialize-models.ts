import { Sequelize } from 'sequelize-typescript'
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
  Agency,
  Domain,
  List,
  UserList,
} from '../models'
import {
  EmailBlacklist,
  EmailFromAddress,
  EmailMessage,
  EmailMessageTransactional,
  EmailOp,
  EmailTemplate,
} from './email'
import { SmsMessage, SmsTemplate, SmsOp } from './sms'
import {
  BotSubscriber,
  TelegramMessage,
  TelegramOp,
  TelegramSubscriber,
  TelegramTemplate,
} from './telegram'

export const initializeModels = (sequelize: Sequelize): void => {
  const coreModels = [
    Credential,
    Campaign,
    Worker,
    JobQueue,
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
