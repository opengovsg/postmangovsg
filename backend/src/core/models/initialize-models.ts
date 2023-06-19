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
  ApiKey,
} from '@core/models'
import {
  EmailBlacklist,
  EmailFromAddress,
  EmailMessage,
  EmailMessageTransactional,
  EmailOp,
  EmailTemplate,
  CommonAttachment,
} from '@email/models'
import {
  SmsMessage,
  SmsMessageTransactional,
  SmsTemplate,
  SmsOp,
} from '@sms/models'
import {
  BotSubscriber,
  TelegramMessage,
  TelegramOp,
  TelegramSubscriber,
  TelegramTemplate,
} from '@telegram/models'
import { GovsgMessage } from '@govsg/models/govsg-message'
import { GovsgMessageTransactional } from '@govsg/models/govsg-message-transactional'
import { GovsgOp } from '@govsg/models/govsg-op'
import { GovsgTemplate } from '@govsg/models/govsg-template'
import { CampaignGovsgTemplate } from '@govsg/models/campaign-govsg-template'

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
  const govsgModels = [
    GovsgMessage,
    GovsgMessageTransactional,
    GovsgOp,
    GovsgTemplate,
    CampaignGovsgTemplate,
  ]
  sequelize.addModels([
    ...coreModels,
    ...emailModels,
    ...smsModels,
    ...telegramModels,
    ...govsgModels,
  ])
}

export default initializeModels
