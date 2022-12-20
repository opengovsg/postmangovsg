import { DuplicateCampaignDetails } from '@shared/core/interfaces/campaign.interface'
import { TelegramTemplate } from '@shared/core/models/telegram'

export interface StoreTemplateInput {
  campaignId: number
  body: string
}
export interface StoreTemplateOutput {
  updatedTemplate: TelegramTemplate
  check?: {
    reupload: boolean
    extraKeys?: string[]
  }
  valid?: boolean
}

export interface TelegramDuplicateCampaignDetails
  extends DuplicateCampaignDetails {
  telegram_templates: {
    body: string
  }
}
