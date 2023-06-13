import { CampaignGovsgTemplate } from '@govsg/models/campaign-govsg-template'
import { GovsgMessage } from '@govsg/models/govsg-message'
import { GovsgTemplate } from '@govsg/models/govsg-template'
import { TemplateClient } from '@shared/templating'

const templateCli = new TemplateClient({
  xssOptions: { whiteList: { br: [] }, stripIgnoreTag: true },
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

  return { body: templateCli.template(template?.body as string, params) }
}
