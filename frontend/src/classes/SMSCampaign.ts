import { Campaign } from './Campaign'

export enum SMSProgress {
  CreateMessage,
  UploadRecipients,
  InsertCredentials,
  ViewStatistics,
}

export class SMSCampaign extends Campaign {
  body: string
  csvFilename: string
  numRecipients: number
  preview: string
  progress: SMSProgress = SMSProgress.CreateMessage

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
      this.progress = SMSProgress.CreateMessage
    }
    if (!this.numRecipients) {
      this.progress = SMSProgress.UploadRecipients
      return
    }
    if (!this.hasCredentials) {
      this.progress = SMSProgress.InsertCredentials
    } else {
      this.progress = SMSProgress.ViewStatistics
    }
  }
}

