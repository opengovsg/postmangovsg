export type WhatsAppId = string

export interface WhatsAppTemplateMessageToSend {
  to: string
  templateName: string
  components: Record<string, string> | null // unsure tbd
  apiClient: WhatsAppApiClient
  language: WhatsAppLanguages
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

enum ContactStatus {
  processing = 'processing',
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
