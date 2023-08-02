import { MessageId, WhatsAppId } from './general'

// for how our db tracks statuses, see GovsgMessageStatus
// On Premises API statuses: https://developers.facebook.com/docs/whatsapp/on-premises/webhooks/components#statuses-object
// Cloud API supports fewer statuses: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#statuses-object
export interface WhatsAppTemplateMessageWebhook {
  statuses: WhatsAppTemplateMessageWebhookStatus[]
  errors?: WebhookError[]
}

export interface UserMessageWebhook {
  contacts: Contact[]
  messages: GenericMessage[]
  errors?: WebhookError[]
}

export interface UserTextMessageWebhook extends UserMessageWebhook {
  messages: WhatsAppWebhookTextMessage[]
}

export enum WhatsAppMessageStatus {
  sent = 'sent',
  delivered = 'delivered',
  read = 'read',
  failed = 'failed',
  deleted = 'deleted',
  warning = 'warning',
}

export interface HasTimestamp {
  timestamp: string // UNIX timestamp in seconds, as a string
}

// omitted Pricing object (unused for now) and type field (can't foresee it being useful)
export interface WhatsAppTemplateMessageWebhookStatus extends HasTimestamp {
  id: MessageId
  message: {
    recipient_id: WhatsAppId
  }
  status: WhatsAppMessageStatus
  conversation?: Conversation // only present in sent and delivered, not read
}

type ConversationId = string
interface Conversation {
  id: ConversationId
  origin: Origin
  expiration_timestamp?: number // UNIX timestamp in seconds, only present on "message sent" webhooks. weirdly it's a number, not a string like the other timestamps
}

enum OriginType {
  authentication = 'authentication',
  marketing = 'marketing',
  utility = 'utility',
  service = 'service',
  referralConversion = 'referral_conversion',
  userInitiated = 'user_initiated', // not documented here: https://developers.facebook.com/docs/whatsapp/on-premises/webhooks/components#origin-object, but mentioned here: https://developers.facebook.com/docs/whatsapp/on-premises/webhooks/outbound#status--message-sent it's all very confusing
}

interface Origin {
  type: OriginType
}

export interface GenericMessage extends HasTimestamp {
  from: WhatsAppId
  id: MessageId
  type: WhatsappWebhookMessageType
}

export interface WhatsAppWebhookButtonMessage extends GenericMessage {
  type: WhatsappWebhookMessageType.button
  button: {
    text: string
  }
  context: {
    id: MessageId
  }
}
export interface WhatsAppWebhookTextMessage extends GenericMessage {
  type: WhatsappWebhookMessageType.text
  text: {
    body: string
  }
}

export enum WhatsappWebhookMessageType {
  text = 'text',
  image = 'image',
  audio = 'audio',
  video = 'video',
  document = 'document',
  location = 'location',
  ephemeral = 'ephemeral', // disappearing message; business cannot see content
  contacts = 'contacts',
  unknown = 'unknown',
  voice = 'voice',
  button = 'button',
}

interface Contact {
  profile: {
    name: string
  }
  wa_id: WhatsAppId
}

export interface WebhookError {
  code: number
  title: string
  details?: string
  href?: string
}
