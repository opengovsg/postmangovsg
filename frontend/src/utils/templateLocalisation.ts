import {
  GovsgTemplateLanguageMetadata,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'

import { GovsgCampaign } from 'classes'

export const getLocalisedTemplateBody = (
  campaign: GovsgCampaign,
  languageCode: WhatsAppLanguages | string
) => {
  return (
    campaign.multilingualSupport.find(
      (languageSupport: GovsgTemplateLanguageMetadata) =>
        languageSupport.languageCode === languageCode.toString()
    )?.body ?? campaign.body
  )
}
