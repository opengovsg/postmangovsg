import { ChannelType } from '@core/constants'
import { EmailTemplate } from '@email/models'
import { GovsgTemplate } from '@govsg/models/govsg-template'
import { SmsTemplate } from '@sms/models'
import { TelegramTemplate } from '@telegram/models'

export type AllowedTemplateTypes =
  | EmailTemplate
  | SmsTemplate
  | TelegramTemplate
  | GovsgTemplate

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
