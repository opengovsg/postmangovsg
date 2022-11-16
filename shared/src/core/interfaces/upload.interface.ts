import { ChannelType } from '../constants'
import { EmailTemplate } from '@shared/core/models/email'
import { SmsTemplate } from '@shared/core/models/sms'
import { TelegramTemplate } from '@shared/core/models/telegram'

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
