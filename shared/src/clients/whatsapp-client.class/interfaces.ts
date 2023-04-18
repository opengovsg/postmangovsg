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
  type: string
}
