import { GovsgTemplateLanguageMetadata } from '@shared/clients/whatsapp-client.class/types'

import { Campaign, CampaignRecipient } from './Campaign'

export enum GovsgProgress {
  PickTemplate,
  UploadRecipients,
}

export type GovsgTemplate = {
  id: number
  name: string
  body: string
  params: Array<string>
  languages: Array<GovsgTemplateLanguageMetadata>
}

export type GovsgTemplateParamMetadata = {
  displayName?: string
  defaultFromMetaField?: string
}

export class GovsgCampaign extends Campaign {
  templateId: number
  body: string
  params: Array<string>
  csvFilename: string
  numRecipients: number
  progress: GovsgProgress = GovsgProgress.PickTemplate
  forSingleRecipient: boolean | null
  paramMetadata: Record<string, GovsgTemplateParamMetadata>
  languages: Array<GovsgTemplateLanguageMetadata>

  constructor(input: any) {
    super(input)
    this.templateId = input['govsg_templates']?.id
    this.body = input['govsg_templates']?.body
    this.params = input['govsg_templates']?.params
    this.csvFilename = input['csv_filename']
    this.numRecipients = input['num_recipients']
    this.forSingleRecipient = input['govsg_templates']?.for_single_recipient
    this.paramMetadata = input['govsg_templates']?.param_metadata
    this.languages = input['govsg_templates']?.languages ?? []
    this.setProgress()
  }
  setProgress() {
    if (!this.templateId) {
      this.progress = GovsgProgress.PickTemplate
    } else {
      this.progress = GovsgProgress.UploadRecipients
    }
  }
}

export class GovsgCampaignRecipient extends CampaignRecipient {
  formatErrorCode(errorCode: string): string {
    return errorCode || ''
  }
}
