import { Campaign } from 'classes/Campaign'

export enum WhatsappProgress {
  SelectCredentials,
  PreviewTemplate,
  SendTestMessage,
  Send,
}
export class WhatsappCampaign extends Campaign {
  body: string
  params: Array<string>
  csvFilename: string
  numRecipients: number

  hasCredential: boolean
  progress: WhatsappProgress = WhatsappProgress.SelectCredentials

  constructor(input: any) {
    super(input)
    this.body = input['whatsapp_templates']?.body
    this.params = input['whatsapp_templates']?.params
    this.csvFilename = input['csv_filename']
    this.hasCredential = input['has_credential']
    this.numRecipients = input['num_recipients']
    this.setProgress()
  }

  setProgress() {
    if (!this.hasCredential) {
      this.progress = WhatsappProgress.SelectCredentials
    } else if (!this.body) {
      this.progress = WhatsappProgress.PreviewTemplate
    } else if (!this.numRecipients) {
      this.progress = WhatsappProgress.SendTestMessage
    } else {
      this.progress = WhatsappProgress.Send
    }
  }
}
