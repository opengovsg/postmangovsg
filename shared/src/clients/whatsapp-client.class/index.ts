import axios, { AxiosError } from 'axios'
import {
  WhatsAppCredentials,
  WhatsAppTemplateMessageToSend,
  WhatsAppApiClient,
  ValidateContact200Response,
  WhatsAppId,
  TemplateMessage200Response,
  MessageId,
  TemplateMessageErrResponse,
} from './interfaces'

const CONTACT_ENDPOINT = 'v1/contacts'
const MESSAGE_ENDPOINT = 'v1/messages'

export default class WhatsAppClient {
  private credentials: WhatsAppCredentials

  constructor(credentials: WhatsAppCredentials) {
    this.credentials = credentials
  }

  private getCredentials(
    apiClient: WhatsAppTemplateMessageToSend['apiClient']
  ): {
    token: string
    url: string
  } {
    switch (apiClient) {
      case WhatsAppApiClient.clientOne:
        return {
          token: this.credentials['authTokenOne'],
          url: this.credentials['onPremClientOneUrl'],
        }
      case WhatsAppApiClient.clientTwo:
        return {
          token: this.credentials['authTokenTwo'],
          url: this.credentials['onPremClientTwoUrl'],
        }
    }
  }
  public async validateSingleRecipient(
    input: WhatsAppTemplateMessageToSend
  ): Promise<WhatsAppId> {
    const { token, url } = this.getCredentials(input.apiClient)
    const res = await axios.request<ValidateContact200Response>({
      method: 'post',
      url: CONTACT_ENDPOINT,
      baseURL: url,
      headers: { Authorization: `Bearer ${token}` },
      data: { blocking: 'wait', contacts: [input.to] },
    })
    const {
      status,
      data: { contacts },
    } = res
    if (status !== 200) {
      throw new Error(
        `Error validating recipient ${input.to}, status code ${status}`
      )
    }
    return contacts[0].wa_id as WhatsAppId
  }

  // public async validateMultipleRecipients(
  //   input: WhatsAppTemplateMessageToSend[]
  // ): Promise<WhatsAppId[]> {
  //   const { tokenOne, urlOne } = this.getCredentials(
  //     WhatsAppApiClient.clientOne
  //   )
  //   const { tokenTwo, urlTwo } = this.getCredentials(
  //     WhatsAppApiClient.clientTwo
  //   )
  // }

  public async sendMessage(
    input: WhatsAppTemplateMessageToSend
  ): Promise<MessageId> {
    const { token, url } = this.getCredentials(input.apiClient)
    const {
      data: { messages },
    } = await axios
      .request<TemplateMessage200Response>({
        method: 'post',
        url: MESSAGE_ENDPOINT,
        baseURL: url,
        headers: { Authorization: `Bearer ${token}` },
        data: {
          to: input.to,
          type: 'template',
          template: {
            namespace: this.credentials['namespace'],
            name: input.templateName,
            language: {
              code: input.language,
              policy: 'deterministic',
            },
          },
          components: [],
        },
      })
      .catch((err: Error | AxiosError) => {
        if (
          axios.isAxiosError<TemplateMessageErrResponse>(err) &&
          err.response
        ) {
          const { errors } = err.response.data
          throw new Error(
            `Error sending message ${JSON.stringify(input)}: ${JSON.stringify(
              errors
            )}`
          )
        }
        throw new Error(
          `Unexpected error while sending message ${JSON.stringify(input)}`
        )
      })
    return messages[0].id
  }
}
