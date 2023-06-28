import { Campaign, CampaignRecipient } from './Campaign'

export enum GovsgProgress {
  PickTemplate,
  UploadRecipients,
  Send,
}

export type GovsgTemplate = {
  id: number
  name: string
  body: string
  params: Array<string>
}

export class GovsgCampaign extends Campaign {
  templateId: number
  body: string
  params: Array<string>
  csvFilename: string
  numRecipients: number
  progress: GovsgProgress = GovsgProgress.PickTemplate

  constructor(input: any) {
    super(input)
    this.templateId = input['govsg_templates']?.id
    this.body = input['govsg_templates']?.body
    this.params = input['govsg_templates']?.params
    this.csvFilename = input['csv_filename']
    this.numRecipients = input['num_recipients']
    this.setProgress()
  }
  setProgress() {
    if (!this.templateId) {
      this.progress = GovsgProgress.PickTemplate
    } else if (!this.numRecipients) {
      this.progress = GovsgProgress.UploadRecipients
    } else {
      this.progress = GovsgProgress.Send
    }
  }
}

export class GovsgCampaignRecipient extends CampaignRecipient {
  formatErrorCode(errorCode: string): string {
    return errorCode || ''
  }
}
