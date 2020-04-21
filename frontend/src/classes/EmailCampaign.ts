import { Campaign } from './Campaign'

export enum EmailProgress {
  CreateTemplate,
  UploadRecipients,
  SendTestMessage,
  Send,
}

export class EmailCampaign extends Campaign {
  body: string
  subject: string
  csvFilename: string
  numRecipients: number
  preview: string
  hasCredential: boolean
  progress: EmailProgress = EmailProgress.CreateTemplate

  constructor(input: any) {
    super(input)
    this.body = input['body']
    this.subject = input['subject']
    this.csvFilename = input['csvFilename']
    this.numRecipients = input['numRecipients']
    this.preview = input['preview']
    this.hasCredential = input['hasCredential']
    this.setProgress()
  }

  setProgress() {
    if (!this.body || !this.subject) {
      this.progress = EmailProgress.CreateTemplate
    } else if (!this.numRecipients) {
      this.progress = EmailProgress.UploadRecipients
    } else if (!this.hasCredential){
      this.progress = EmailProgress.SendTestMessage
    } else {
      this.progress = EmailProgress.Send
    }
  }
}

