export interface WhatsappCredentials {
  bearerToken: string

  baseUrl: string
  version: string
}

export interface WhatsappTemplate {
  category: string
  components: WhatsappTemplateComponent[]
  id: string
  language: string
  status: string
}

export interface WhatsappTemplateComponent {
  format: string
  text: string
  type: string
}
