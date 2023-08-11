import {
  GovsgTemplateLanguageMetadata,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'

export const getLocalisedTemplateBody = (
  languages: GovsgTemplateLanguageMetadata[],
  languageCode: WhatsAppLanguages | string,
  defaultBody: string
) => {
  if (!languages) {
    return defaultBody
  }
  return (
    languages.find(
      (languageSupport: GovsgTemplateLanguageMetadata) =>
        languageSupport.code === languageCode.toString()
    )?.body ?? defaultBody
  )
}
