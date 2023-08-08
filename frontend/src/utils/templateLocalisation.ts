import {
  GovsgTemplateLanguageMetadata,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'

export const getLocalisedTemplateBody = (
  multilingualSupport: GovsgTemplateLanguageMetadata[],
  languageCode: WhatsAppLanguages | string,
  defaultBody: string
) => {
  return (
    multilingualSupport.find(
      (languageSupport: GovsgTemplateLanguageMetadata) =>
        languageSupport.languageCode === languageCode.toString()
    )?.body ?? defaultBody
  )
}
