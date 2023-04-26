import { Sequelize } from 'sequelize-typescript'
import {
  Agency,
  ApiKey,
  Campaign,
  Credential,
  Domain,
  DomainCredential,
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
import { CampaignWhatsappTemplate } from '@whatsapp/models/campaign-whatsapp-template'
import { WhatsappMessage } from '@whatsapp/models/whatsapp-message'
import { WhatsappOp } from '@whatsapp/models/whatsapp-op'
import { WhatsappTemplate } from '@whatsapp/models/whatsapp-template'

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
    DomainCredential,
    List,
    UserList,
    ApiKey,
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
  const smsModels = [SmsMessage, SmsMessageTransactional, SmsTemplate, SmsOp]
  const telegramModels = [
    BotSubscriber,
    TelegramOp,
    TelegramMessage,
    TelegramTemplate,
    TelegramSubscriber,
  ]
  const whatsappModels = [
    CampaignWhatsappTemplate,
    WhatsappMessage,
    WhatsappOp,
    WhatsappTemplate,
  ]
  sequelize.addModels([
    ...coreModels,
    ...emailModels,
    ...smsModels,
    ...telegramModels,
    ...whatsappModels,
  ])
}

export default initializeModels
