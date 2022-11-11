import { ChannelType } from 'core/constants'
import { EmailTemplate } from 'backend/src/email/models'
import { SmsTemplate } from 'backend/src/sms/models'
import { TelegramTemplate } from 'backend/src/telegram/models'

export type AllowedTemplateTypes =
  | EmailTemplate
  | SmsTemplate
  | TelegramTemplate

export interface UploadData<Template extends AllowedTemplateTypes> {
  campaignId: number
  template: Template
  s3Key: string
  etag: string
  filename: string
}

export interface Upload {
  channelType: ChannelType
  protect?: boolean
  data: UploadData<AllowedTemplateTypes>
}
