export interface WhatsappCredentials {
  bearerToken: string

  baseUrl: string
  version: string
}

export interface WhatsappTemplate {
  category: WhatsappTemplateCategory
  components: WhatsappTemplateComponent[]
  id: string
  language: string
  status: WhatsappTemplateStatus
}

export enum WhatsappTemplateStatus {
  APPROVED = 'APPROVED',
  IN_APPEAL = 'IN_APPEAL',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  PENDING_DELETION = 'PENDING_DELETION',
  DELETED = 'DELETED',
  DISABLED = 'DISABLED',
  PAUSED = 'PAUSED',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
}

export enum WhatsappTemplateCategory {
  ACCOUNT_UPDATE = 'ACCOUNT_UPDATE',
  PAYMENT_UPDATE = 'PAYMENT_UPDATE',
  PERSONAL_FINANCE_UPDATE = 'PERSONAL_FINANCE_UPDATE',
  SHIPPING_UPDATE = 'SHIPPING_UPDATE',
  RESERVATION_UPDATE = 'RESERVATION_UPDATE',
  ISSUE_RESOLUTION = 'ISSUE_RESOLUTION',
  APPOINTMENT_UPDATE = 'APPOINTMENT_UPDATE',
  TRANSPORTATION_UPDATE = 'TRANSPORTATION_UPDATE',
  TICKET_UPDATE = 'TICKET_UPDATE',
  ALERT_UPDATE = 'ALERT_UPDATE',
  AUTO_REPLY = 'AUTO_REPLY',
  TRANSACTIONAL = 'TRANSACTIONAL',
  OTP = 'OTP',
  UTILITY = 'UTILITY',
  MARKETING = 'MARKETING',
  AUTHENTICATION = 'AUTHENTICATION',
}
export interface WhatsappTemplateComponent {
  format: string
  text: string
  type: WhatsappTemplateComponentType
}

export enum WhatsappTemplateComponentType {
  HEADER = 'HEADER',
  BODY = 'BODY',
  FOOTER = 'FOOTER',
}

export interface WhatsappCallbackPayload {
  entry: WhatsappCallbackEntry[]
  // should technically be an enum, but it will always be the same value as we are only subscribing whatsapp webhooks
  object: string
}

export interface WhatsappCallbackEntry {
  id: string
  time: number
  changes: WhatsappCallbackChange[]
}

export interface WhatsappCallbackChange {
  field: WhatsappCallbackChangeField
  // Each type of callback change field would have it's own different value object...
  value: any
}

export enum WhatsappCallbackChangeField {
  MESSAGE_TEMPLATE_STATUS_UPDATE = 'message_template_status_update',
  MESSAGES = 'messages',
  ACCOUNT_UPDATE = 'account_update',

  // there are others but they won't be handled.
}

export interface WhatsappPhoneNumber {
  id: string
  verified_name: string
  code_verification_status: WhatsappPhoneNumberVerificationStatus
  display_phone_number: string
  quality_rating: string
}

export enum WhatsappPhoneNumberVerificationStatus {
  EXPIRED = 'EXPIRED',
  VERIFIED = 'VERIFIED',
  NOT_VERIFIED = 'NOT_VERIFIED',
}
