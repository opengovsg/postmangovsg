import axios, { AxiosError, AxiosInstance } from 'axios'
import https from 'https'
import {
  WhatsAppCredentials,
  WhatsAppTemplateMessageToSend,
  WhatsAppApiClient,
  ValidateContact200Response,
  WhatsAppId,
  TemplateMessage200Response,
  MessageId,
  TemplateMessageErrResponse,
  ValidatedWhatsAppTemplateMessageToSend,
  ContactStatus,
  UnvalidatedWhatsAppTemplateMessageToSend,
} from './interfaces'
import { AuthenticationError, RateLimitError } from './errors'

const CONTACT_ENDPOINT = 'v1/contacts'
const MESSAGE_ENDPOINT = 'v1/messages'

export default class WhatsAppClient {
  private credentials: WhatsAppCredentials
  private axiosInstance: AxiosInstance

  constructor(credentials: WhatsAppCredentials) {
    this.credentials = credentials
    this.axiosInstance = axios.create({
      responseType: 'json',
      httpsAgent: new https.Agent({
        // required for connecting to on-prem API client
        rejectUnauthorized: false,
        keepAlive: true,
      }),
    })
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
    input: WhatsAppTemplateMessageToSend,
    isLocal = false
  ): Promise<WhatsAppId> {
    // bypass validation in local environment because no access to on-prem API
    // proxy can only send message, no endpoint for validation
    if (isLocal) {
      return input.recipient
    }
    const { token, url } = this.getCredentials(input.apiClient)
    const res = await this.axiosInstance
      .request<ValidateContact200Response>({
        method: 'post',
        url: CONTACT_ENDPOINT,
        baseURL: url,
        headers: { Authorization: `Bearer ${token}` },
        data: { blocking: 'wait', contacts: [input.recipient] },
      })
      .catch((err: Error | AxiosError) => {
        if (axios.isAxiosError(err) && err.response) {
          throw new Error(
            `Error validating recipient ${input.recipient}: ${JSON.stringify(
              err.response
            )}`
          )
        }
        throw new Error(
          `Unexpected error validating recipient ${
            input.recipient
          }. Error: ${JSON.stringify(err)}`
        )
      })
    const {
      data: { contacts },
    } = res
    return contacts[0].wa_id as WhatsAppId
  }

  public async validateMultipleRecipients(
    inputs: UnvalidatedWhatsAppTemplateMessageToSend[],
    isLocal = false
  ): Promise<ValidatedWhatsAppTemplateMessageToSend[]> {
    // bypass validation in local environment because no access to on-prem API
    // proxy can only send message, no endpoint for validation
    if (isLocal) {
      return inputs.map((i) => ({
        ...i,
        waId: i.recipient,
        status: ContactStatus.valid, // as long as you're testing locally to your own WhatsApp, should be ok
      }))
    }
    const { token: tokenOne, url: urlOne } = this.getCredentials(
      WhatsAppApiClient.clientOne
    )
    const { token: tokenTwo, url: urlTwo } = this.getCredentials(
      WhatsAppApiClient.clientTwo
    )
    const clientOneRecipients = inputs
      .filter((i) => i.apiClient === WhatsAppApiClient.clientOne)
      .map((i) => i.recipient)
    const clientTwoRecipients = inputs
      .filter((i) => i.apiClient === WhatsAppApiClient.clientTwo)
      .map((i) => i.recipient)
    const [validatedClientOneData, validatedClientTwoData] = await Promise.all([
      this.axiosInstance.request<ValidateContact200Response>({
        method: 'post',
        url: CONTACT_ENDPOINT,
        baseURL: urlOne,
        headers: { Authorization: `Bearer ${tokenOne}` },
        data: { blocking: 'wait', contacts: clientOneRecipients },
      }),
      this.axiosInstance.request<ValidateContact200Response>({
        method: 'post',
        url: CONTACT_ENDPOINT,
        baseURL: urlTwo,
        headers: { Authorization: `Bearer ${tokenTwo}` },
        data: { blocking: 'wait', contacts: clientTwoRecipients },
      }),
    ]).catch((err: Error | AxiosError) => {
      if (axios.isAxiosError(err) && err.response) {
        throw new Error(
          `Error validating recipients ${JSON.stringify(
            inputs
          )}: ${JSON.stringify(err.response)}`
        )
      }
      throw new Error(
        `Unexpected error validating recipients ${JSON.stringify(
          inputs
        )}. Error: ${JSON.stringify(err)}`
      )
    })
    const clientOneMap = new Map(
      validatedClientOneData.data.contacts.map((c) => [c.input, c.wa_id])
    )
    const clientTwoMap = new Map(
      validatedClientTwoData.data.contacts.map((c) => [c.input, c.wa_id])
    )
    return inputs.map((i) => {
      const waId =
        i.apiClient === WhatsAppApiClient.clientOne
          ? clientOneMap.get(i.recipient)
          : clientTwoMap.get(i.recipient)
      const status =
        // since blocking is set to wait, if waId is undefined, it means the contact is blocked
        // see https://developers.facebook.com/docs/whatsapp/on-premises/reference/contacts#blocking
        waId === undefined ? ContactStatus.failed : ContactStatus.valid
      return { ...i, waId, status }
    })
  }

  public async sendMessage(
    input: WhatsAppTemplateMessageToSend,
    isLocal = false
  ): Promise<MessageId> {
    const { token, url } = this.getCredentials(input.apiClient)
    // modify headers and baseURL if local environment to send to proxy
    const { headers, baseURL } = isLocal
      ? {
          headers: {
            Authorization: `Bearer proxy=${this.credentials['proxyToken']} client=${token}`,
          },
          baseURL: `${this.credentials['proxyUrl']}`,
        }
      : { headers: { Authorization: `Bearer ${token}` }, baseURL: url }
    const {
      data: { messages },
    } = await this.axiosInstance
      .request<TemplateMessage200Response>({
        method: 'post',
        url: MESSAGE_ENDPOINT,
        baseURL,
        headers,
        data: {
          to: input.recipient,
          type: 'template',
          template: {
            namespace: this.credentials['namespace'],
            name: input.templateName,
            language: {
              code: input.language,
              policy: 'deterministic',
            },
          },
          components: [], // TODO
        },
      })
      .catch((err: Error | AxiosError) => {
        if (
          axios.isAxiosError<TemplateMessageErrResponse>(err) &&
          err.response
        ) {
          const { status } = err.response
          const { errors } = err.response.data
          const { code, title, detail } = errors[0]
          if (status === 401) {
            throw new AuthenticationError(`${code}: ${title} - ${detail}`)
          }
          if (status === 429) {
            throw new RateLimitError(`${code}: ${title} - ${detail}`)
          }
          throw new Error(
            `Error sending message ${JSON.stringify(
              input
            )}.\n Errors countered: ${JSON.stringify(errors)}`
          )
        }
        throw new Error(
          `Unexpected error while sending message. Input: ${JSON.stringify(
            input
          )}, Error: ${JSON.stringify(err)}`
        )
      })
    return messages[0].id
  }
}
