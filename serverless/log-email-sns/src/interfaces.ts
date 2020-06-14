export interface Metadata {
  id: string
  timestamp: string
  messageId?: string
}

export interface BounceMetadata extends Metadata {
  message?: {
    bounce?: {
      bounceType?: string
    }
    mail?: {
      commonHeaders?: {
        to?: string[]
      }
    }
  }
}

export interface ComplaintMetadata extends Metadata {
  message?: {
    complaint?: {
      complaintFeedbackType?: string
    }
    mail?: {
      commonHeaders?: {
        to?: string[]
      }
    }
  }
}

export interface UpdateMessageWithErrorCode extends Metadata {
  errorCode: string
}
