// can consider using Brand<T, U> to enforce type safety
export type WhatsAppId = string

export type MessageId = string

export type Message = {
  id: MessageId
}

export type GovsgTemplateLanguageMetadata = {
  code: string // WhatsApp-API-compatible language code
  language: string // Human-readable name of the language
  body: string
}
