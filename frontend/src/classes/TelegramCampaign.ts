import { Campaign } from './Campaign'

export enum TelegramProgress {
  CreateTemplate,
  UploadRecipients,
  InsertCredentials,
  Send,
}

export interface TelegramPreview {
  body: string
}

export class TelegramCampaign extends Campaign {
  body: string
  params: Array<string>
  csvFilename: string
  numRecipients: number
  preview: string
  hasCredential: boolean
  progress: TelegramProgress = TelegramProgress.CreateTemplate

  constructor(input: any) {
    super(input)
    this.body = input['telegram_templates']?.body
    this.params = input['telegram_templates']?.params
    this.csvFilename = input['csv_filename']
    this.numRecipients = input['num_recipients']
    this.preview = input['preview']
    this.hasCredential = input['has_credential']
    this.setProgress()
  }

  setProgress() {
    if (!this.body) {
      this.progress = TelegramProgress.CreateTemplate
    } else if (!this.numRecipients) {
      this.progress = TelegramProgress.UploadRecipients
    } else if (!this.hasCredential) {
      this.progress = TelegramProgress.InsertCredentials
    } else {
      this.progress = TelegramProgress.Send
    }
  }
}
