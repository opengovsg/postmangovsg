import { MessageId, WhatsAppId } from './general'

export interface WhatsAppTemplateMessageToSend {
  recipient: string
  templateName: string
  params: NormalisedParam[]
  apiClient: WhatsAppApiClient
  language: WhatsAppLanguages
}

export interface WhatsAppTextMessageToSend {
  recipient: string
  body: string
  apiClient: WhatsAppApiClient
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
export interface NormalisedParam {
  type: string
  text: string
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
  adminCredentialsOne: string
  adminCredentialsTwo: string
  onPremClientOneUrl: string
  onPremClientTwoUrl: string
  proxyToken: string
  proxyUrl: string
}

export interface ValidateContact200Response {
  contacts: ContactWithWAId[]
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

export enum ContactStatus {
  processing = 'processing', // will not occur if blocking is set to 'wait' https://developers.facebook.com/docs/whatsapp/on-premises/reference/contacts#blocking
  valid = 'valid',
  failed = 'failed',
}

type Contact = {
  input: string // input supplied; WhatsApp can sanitise this
  status: ContactStatus
}

type ContactWithWAId = Contact & {
  wa_id: WhatsAppId // only returned if status is valid
}

type Meta = {
  version: string
  api_status: string
}

type Message = {
  id: MessageId
}

export interface UsersLogin200Response {
  users: User[]
  meta: Meta
}

type User = {
  token: string
  expires_after: string // in ISO format e.g. 2018-03-01 15:29:26+00:00 in UTC
}
