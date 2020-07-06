export interface Metadata {
  id: string
  timestamp: string
  messageId?: string
}

export interface BounceMetadata extends Metadata {
  bounceType?: string
  to?: string[]
}

export interface ComplaintMetadata extends Metadata {
  complaintType?: string
  to?: string[]
}

export interface UpdateMessageWithErrorCode extends Metadata {
  errorCode: string
}

// export interface EventParser {
//   validateSignature (event: any) : boolean;
//   parseDelivered (event: any) : boolean;
//   parseBounce (event: any) : boolean;
//   parseComplaint (event: any) : boolean;
// }
