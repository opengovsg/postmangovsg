import { Attachment } from 'nodemailer/lib/mailer'

export type MailAttachment = Pick<Attachment, 'filename' | 'content' | 'cid'>

export interface MailToSend {
  recipients: Array<string>
  subject: string
  body: string
  replyTo?: string
  messageId?: string
  from?: string
  unsubLink?: string
  attachments?: Array<MailAttachment>
  bcc?: Array<string>
  cc?: Array<string>
}

export interface MailCredentials {
  host: string
  port: number
  auth: {
    user: string
    pass: string
  }
}
