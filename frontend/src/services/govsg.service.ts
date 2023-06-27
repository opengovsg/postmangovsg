import axios from 'axios'

type GovsgTemplate = {
  id: number
  name: string
  body: string
  params: Array<string>
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
}: {
  campaignId: number
  templateId: number
}): Promise<{ num_recipients: number; template: GovsgTemplate }> {
  try {
    const response = await axios.put(`/campaign/${campaignId}/govsg/template`, {
      template_id: templateId,
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
