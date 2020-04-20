import { Campaign } from './Campaign'

export enum EmailProgress {
  CreateTemplate,
  UploadRecipients,
  Send,
}

export class EmailCampaign extends Campaign {
  body: string
  subject: string
  csvFilename: string
  numRecipients: number
  preview: string
  progress: EmailProgress = EmailProgress.CreateTemplate

  constructor(input: any) {
    super(input)
    this.body = input['body']
    this.subject = input['subject']
    this.csvFilename = input['csvFilename']
    this.numRecipients = input['numRecipients']
    this.preview = input['preview']
    this.setProgress()
  }

  setProgress() {
    if (!this.body || !this.subject) {
      this.progress = EmailProgress.CreateTemplate
    } else if (!this.numRecipients) {
      this.progress = EmailProgress.UploadRecipients
    } else {
      this.progress = EmailProgress.Send
    }
  }
}

