import { DuplicateCampaignDetails } from '@shared/core/interfaces/campaign.interface'
import { SmsTemplate } from '@shared/core/models/sms'

export interface StoreTemplateInput {
  campaignId: number
  body: string
}
export interface StoreTemplateOutput {
  updatedTemplate: SmsTemplate
  check?: {
    reupload: boolean
    extraKeys?: string[]
  }
  valid?: boolean
}

export interface SmsDuplicateCampaignDetails extends DuplicateCampaignDetails {
  sms_templates: {
    body: string
  }
}
