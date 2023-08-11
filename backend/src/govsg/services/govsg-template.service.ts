import { UploadData } from '@core/interfaces'
import { UploadService } from '@core/services'
import { CampaignGovsgTemplate } from '@govsg/models/campaign-govsg-template'
import { GovsgMessage } from '@govsg/models/govsg-message'
import { GovsgTemplate } from '@govsg/models/govsg-template'
import { TemplateClient, XSS_EMAIL_OPTION } from '@shared/templating'
import { GovsgService } from '.'

const templateCli = new TemplateClient({
  xssOptions: XSS_EMAIL_OPTION,
})

export async function getFilledTemplate(
  campaignId: number
): Promise<GovsgTemplate | null> {
  const pivot = await CampaignGovsgTemplate.findOne({
    where: { campaignId },
    include: [
      {
        model: GovsgTemplate,
      },
    ],
  })
  if (!pivot || !pivot.govsgTemplate) {
    return null
  }
  return pivot.govsgTemplate
}

const getLocalisedTemplateBody = (
  template: GovsgTemplate | null,
  language: string | undefined
) => {
  if (!language) {
    return template?.body as string
  }
  const languageInLowerCase = language.toLowerCase()
  return (template?.multilingualSupport.find(
    (languageSupport) =>
      languageSupport.language.toLowerCase() === languageInLowerCase
  )?.body ?? template?.body) as string
}

export async function getHydratedMessage(
  campaignId: number
): Promise<{ body: string } | null> {
  const template = await getFilledTemplate(campaignId)

  const message = await GovsgMessage.findOne({
    where: { campaignId },
    attributes: ['params'],
  })
  if (!message) {
    return null
  }
  const params = message.params as { [key: string]: string }
  if (!params || !template) {
    return null
  }

  const localisedTemplateBody = getLocalisedTemplateBody(
    template,
    params.language
  )
  return { body: templateCli.template(localisedTemplateBody, params) }
}

export function testHydration(
  records: Array<{ params: { [key: string]: string } }>,
  templateBody: string
): void {
  templateCli.template(templateBody, records[0].params)
}

export function processUpload(
  uploadData: UploadData<GovsgTemplate>
): Promise<void> {
  return UploadService.processUpload<GovsgTemplate>(
    GovsgService.uploadCompleteOnPreview,
    GovsgService.uploadCompleteOnChunk
  )(uploadData)
}
