// can consider using Brand<T, U> to enforce type safety
export type WhatsAppId = string

export interface WhatsAppTemplateMessageToSend {
  recipient: string
  templateName: string
  params: { [key: string]: string }
  apiClient: WhatsAppApiClient
  language: WhatsAppLanguages
}

export type UnvalidatedWhatsAppTemplateMessageToSend =
  WhatsAppTemplateMessageToSend & {
    id: number
  }

export type ValidatedWhatsAppTemplateMessageToSend =
  UnvalidatedWhatsAppTemplateMessageToSend & {
    status: ContactStatus
    waId: WhatsAppId | undefined // if status is valid, waId is defined
  }

export enum WhatsAppApiClient {
  clientOne = 'client_one', // 6581290065
  clientTwo = 'client_two', // 6597249836
}

export enum WhatsAppLanguages {
  english = 'en_GB',
  chinese = 'zh_CN',
  malay = 'ms',
  tamil = 'ta',
}

export interface WhatsAppCredentials {
  namespace: string
  authTokenOne: string
  authTokenTwo: string
  onPremClientOneUrl: string
  onPremClientTwoUrl: string
  proxyToken: string
  proxyUrl: string
}

export interface ValidateContact200Response {
  contacts: ContactWithWAId[]
}

type Contact = {
  input: string // input supplied; WhatsApp can sanitise this
  status: ContactStatus
}

type ContactWithWAId = Contact & {
  wa_id: WhatsAppId // only returned if status is valid
}

export enum ContactStatus {
  processing = 'processing', // will not occur if blocking is set to 'wait' https://developers.facebook.com/docs/whatsapp/on-premises/reference/contacts#blocking
  valid = 'valid',
  failed = 'failed',
}

export type MessageId = string

export type Message = {
  id: MessageId
}

type Meta = {
  version: string
  api_status: string
}

export interface TemplateMessage200Response {
  contacts: Contact[]
  messages: Message[]
  meta: Meta
}

export interface TemplateMessageErrResponse {
  errors: Array<{
    code: number
    title: string
    detail: string
  }>
  meta: Meta
}
