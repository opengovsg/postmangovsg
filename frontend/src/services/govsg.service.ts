import { GovsgTemplateLanguageMetadata } from '@shared/clients/whatsapp-client.class/types'
import axios from 'axios'

import { GovsgTemplateParamMetadata } from 'classes'

type GovsgTemplate = {
  id: number
  name: string
  body: string
  params: Array<string>
  param_metadata: Record<string, GovsgTemplateParamMetadata>
  multilingual_support: Array<
    GovsgTemplateLanguageMetadata & { language_code: string }
  >
}

export async function getAvailableTemplates(): Promise<Array<GovsgTemplate>> {
  try {
    const response = await axios.get('/govsg/templates')
    return response.data.data
  } catch (e) {
    errorHandler(e, 'Unable to retrieve available Govsg template')
  }
}

export async function pickTemplate({
  campaignId,
  templateId,
  forSingleRecipient,
}: {
  campaignId: number
  templateId: number
  forSingleRecipient: boolean
}): Promise<{ num_recipients: number; template: GovsgTemplate }> {
  try {
    const response = await axios.put(`/campaign/${campaignId}/govsg/template`, {
      template_id: templateId,
      for_single_recipient: forSingleRecipient,
    })
    return response.data
  } catch (e) {
    errorHandler(e, 'Error picking template')
  }
}

export async function getPreviewMessage(
  campaignId: number
): Promise<{ body: string }> {
  try {
    const response = await axios.get(`/campaign/${campaignId}/govsg/preview`)
    return response.data?.preview
  } catch (e) {
    errorHandler(e, 'Unable to get preview message')
  }
}

export async function sendSingleRecipientCampaign(
  campaignId: number,
  params: Record<string, string>
): Promise<void> {
  await axios.post(`/campaign/${campaignId}/govsg/send-single`, {
    recipient: params.recipient,
    language_code: params.languageCode,
    params,
  })
}

function errorHandler(e: unknown, defaultMsg: string): never {
  console.error(e)
  if (
    axios.isAxiosError(e) &&
    e.response &&
    e.response.data &&
    e.response.data.message
  ) {
    throw new Error(e.response.data.message)
  }
  throw new Error(defaultMsg)
}
