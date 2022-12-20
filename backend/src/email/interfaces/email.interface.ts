import { DuplicateCampaignDetails } from '@shared/core/interfaces/campaign.interface'
import { EmailTemplate } from '@shared/core/models/email'

export interface StoreTemplateInput {
  campaignId: number
  subject: string
  body: string
  replyTo: string | null
  from: string
  showLogo: boolean
}
export interface StoreTemplateOutput {
  updatedTemplate: EmailTemplate
  check?: {
    reupload: boolean
    extraKeys?: string[]
  }
  valid?: boolean
}

export interface EmailDuplicateCampaignDetails
  extends DuplicateCampaignDetails {
  email_templates: {
    body: string
    subject: string
    reply_to: string | null
    from: string
  }
}
