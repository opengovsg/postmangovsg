import { t } from '@lingui/macro'
import { Campaign, CampaignRecipient } from './Campaign'

export enum SMSProgress {
  CreateTemplate,
  UploadRecipients,
  InsertCredentials,
  Send,
}

export interface SMSPreview {
  body: string
}

export class SMSCampaign extends Campaign {
  body?: string
  params?: string[]
  csvFilename: string
  numRecipients: number
  hasCredential: boolean
  progress: SMSProgress = SMSProgress.CreateTemplate

  constructor(input: any) {
    super(input)
    this.body = input['sms_templates']?.body
    this.params = input['sms_templates']?.params
    this.csvFilename = input['csv_filename']
    this.numRecipients = input['num_recipients']
    this.hasCredential = input['has_credential']
    this.setProgress()
  }

  setProgress() {
    if (!this.body) {
      this.progress = SMSProgress.CreateTemplate
    } else if (!this.numRecipients) {
      this.progress = SMSProgress.UploadRecipients
    } else if (!this.hasCredential) {
      this.progress = SMSProgress.InsertCredentials
    } else {
      this.progress = SMSProgress.Send
    }
  }
}

export class SMSCampaignRecipient extends CampaignRecipient {
  formatErrorCode(errorCode: string): string {
    if (errorCode) {
      if (errorCode.startsWith("The 'To'")) {
        return t`errors.sms.invalidPhoneNumber`
      } else if (errorCode === 'Recipient is incorrectly formatted') {
        return t`errors.sms.invalidFormat`
      }
    }
    return errorCode || ''
  }
}
