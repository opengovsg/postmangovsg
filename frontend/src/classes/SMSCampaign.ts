import { Campaign } from './Campaign'

export enum SMSProgress {
  CreateTemplate,
  UploadRecipients,
  InsertCredentials,
  Send,
}

export class SMSCampaign extends Campaign {
  body: string
  csvFilename: string
  numRecipients: number
  preview: string
  progress: SMSProgress = SMSProgress.CreateTemplate

  constructor(input: any) {
    super(input)
    this.body = input['body']
    this.csvFilename = input['csvFilename']
    this.numRecipients = input['numRecipients']
    this.preview = input['preview']
    this.setProgress()
  }

  setProgress() {
    if (!this.body) {
      this.progress = SMSProgress.CreateTemplate
    }
    if (!this.numRecipients) {
      this.progress = SMSProgress.UploadRecipients
      return
    }
    if (!this.hasCredentials) {
      this.progress = SMSProgress.InsertCredentials
    } else {
      this.progress = SMSProgress.Send
    }
  }
}

