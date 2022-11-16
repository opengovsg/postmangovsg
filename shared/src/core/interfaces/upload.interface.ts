import { ChannelType } from '../constants'
import { EmailTemplate } from '@models/email'
import { SmsTemplate } from '@models/sms'
import { TelegramTemplate } from '@models/telegram'

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
