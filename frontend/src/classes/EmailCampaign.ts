import { Campaign } from './Campaign'

export enum EmailProgress {
  CreateTemplate,
  UploadRecipients,
  SendTestMessage,
  Send,
}

export class EmailCampaign extends Campaign {
  body: string
  params: Array<string>
  subject: string
  replyTo: string | null
  csvFilename: string
  numRecipients: number
  preview: string
  hasCredential: boolean
  progress: EmailProgress = EmailProgress.CreateTemplate

  constructor(input: any) {
    super(input)
    this.body = input['email_templates']?.body
    this.params = input['email_templates']?.params
    this.subject = input['email_templates']?.subject
    this.replyTo = input['email_templates']?.reply_to
    this.csvFilename = input['csv_filename']
    this.numRecipients = input['num_recipients']
    this.preview = input['preview']
    this.hasCredential = input['has_credential']
    this.setProgress()
  }

  setProgress() {
    if (!this.body || !this.subject) {
      this.progress = EmailProgress.CreateTemplate
    } else if (!this.numRecipients) {
      this.progress = EmailProgress.UploadRecipients
    } else if (!this.hasCredential) {
      this.progress = EmailProgress.SendTestMessage
    } else {
      this.progress = EmailProgress.Send
    }
  }
}
