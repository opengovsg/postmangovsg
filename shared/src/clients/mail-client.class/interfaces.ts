export interface MailAttachment {
  filename: string
  content: Buffer
  // TODO: refactor into optional field?
  cid: string // automatically generated for all attachments; for use as content-id images
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
  bcc?: Array<string>
}

export interface MailCredentials {
  host: string
  port: number
  auth: {
    user: string
    pass: string
  }
}
