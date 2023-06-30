import { MessageId, WhatsAppId } from './general'

// for how our db tracks statuses, see GovsgMessageStatus
// On Premises API statuses: https://developers.facebook.com/docs/whatsapp/on-premises/webhooks/components#statuses-object
// Cloud API supports fewer statuses: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#statuses-object
export interface WhatsAppTemplateMessageWebhook {
  statuses: WhatsAppTemplateMessageWebhookStatus[]
}

export interface UserMessageWebhook {
  contacts: Contact[]
  messages: GenericMessage[]
}

export interface UserTextMessageWebhook extends UserMessageWebhook {
  messages: TextMessage[]
}

enum WhatsAppMessageStatus {
  sent = 'sent',
  delivered = 'delivered',
  read = 'read',
  failed = 'failed',
  deleted = 'deleted',
  warning = 'warning',
}

// omitted Pricing object (unused for now) and type field (can't foresee it being useful)
interface WhatsAppTemplateMessageWebhookStatus {
  id: MessageId
  message: {
    recipient_id: WhatsAppId
  }
  status: WhatsAppMessageStatus
  timestamp: string // UNIX timestamp in seconds, as a string
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

interface GenericMessage {
  from: WhatsAppId
  id: MessageId
  timestamp: string // UNIX timestamp in seconds, as a string
  type: MessageType
}

interface TextMessage extends GenericMessage {
  type: MessageType.text
  text: {
    body: string
  }
}

enum MessageType {
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
}

interface Contact {
  profile: {
    name: string
  }
  wa_id: WhatsAppId
}
