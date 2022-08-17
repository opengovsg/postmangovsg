export interface MailAttachment {
  filename: string
  content: Buffer
}

export interface MailToSend {
  recipients: Array<string>
  subject: string
  body: string
  replyTo?: string
  referenceId?: string
  from?: string
  unsubLink?: string
  attachments?: Array<MailAttachment>
}

export interface MailCredentials {
  host: string
  port: number
  auth: {
    user: string
    pass: string
  }
}
