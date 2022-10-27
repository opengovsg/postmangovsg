export interface Metadata {
  id: string
  timestamp: string
  messageId?: string
}

export interface BounceMetadata extends Metadata {
  bounceType?: string
  bounceSubType?: string
  to?: string[]
}

export interface ComplaintMetadata extends Metadata {
  complaintType?: string
  complaintSubType?: string
  to?: string[]
}

export interface UpdateMessageWithErrorMetadata extends Metadata {
  errorCode: string
  errorSubType?: string
}

export enum SesEventType {
  Delivery = 'Delivery',
  Bounce = 'Bounce',
  Complaint = 'Complaint',
  Open = 'Open',
  Send = 'Send',
}
