import { DuplicateCampaignDetails } from '@core/interfaces/campaign.interface'
import { EmailTemplate } from '@email/models'

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
