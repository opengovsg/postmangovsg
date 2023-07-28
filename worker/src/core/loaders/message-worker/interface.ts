import {
  WhatsAppApiClient,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'

export interface Message {
  id: number
  recipient: string
  params: { [key: string]: string }
  body: string // TODO: refactor; not needed for Govsg Messages
  subject?: string
  replyTo?: string | null
  campaignId?: number
  from?: string
  agencyName?: string
  agencyLogoURI?: string
  showMasthead?: boolean
  paramOrder?: string[] // for whatsapp whose templates dont use named params
  whatsappTemplateLabel?: string
  apiClient?: WhatsAppApiClient
  language?: WhatsAppLanguages
  userUniqueLink?: string
  unsubLink?: string // custom unsubscribe link
}

export interface ContactChannel {
  channel: string
  channelId: string
  contactPrefLink?: string
}

export interface EmailResultRow {
  message: Message & { senderEmail: string }
}
