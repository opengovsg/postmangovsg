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
  hasCredential: boolean
  progress: SMSProgress = SMSProgress.CreateTemplate

  constructor(input: any) {
    super(input)
    this.body = input['body']
    this.csvFilename = input['csvFilename']
    this.numRecipients = input['numRecipients']
    this.preview = input['preview']
    this.hasCredential = input['hasCredential']
    this.setProgress()
  }

  setProgress() {
    if (!this.body) {
      this.progress = SMSProgress.CreateTemplate
      return
    }
    if (!this.numRecipients) {
      this.progress = SMSProgress.UploadRecipients
      return
    }
    if (!this.hasCredential) {
      this.progress = SMSProgress.InsertCredentials
    } else {
      this.progress = SMSProgress.Send
    }
  }
}

