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
  NormalisedParam,
  WhatsAppTextMessageToSend,
  UsersLogin200Response,
} from './types'
import { AuthenticationError, RateLimitError } from './errors'

const CONTACT_ENDPOINT = 'v1/contacts'
const MESSAGE_ENDPOINT = 'v1/messages'
const AUTH_ENDPOINT = 'v1/users/login'

interface AuthToken {
  token: string
  expiry: Date
}

export default class WhatsAppClient {
  private credentials: WhatsAppCredentials
  private axiosInstance: AxiosInstance
  private authTokenOneObj: AuthToken | undefined
  private authTokenTwoObj: AuthToken | undefined
  private isLocal = false

  constructor(credentials: WhatsAppCredentials, isLocal = false) {
    this.credentials = credentials
    this.axiosInstance = axios.create({
      responseType: 'json',
      httpsAgent: new https.Agent({
        // required for connecting to on-prem API client
        rejectUnauthorized: false,
        keepAlive: true,
      }),
      // As the on-prem client is super quirky and just doesn't respond when the
      // input is invalid, we set a timeout so there's a guaranteed error thrown
      // instead this API client hogging our resources
      timeout: 30 * 1000,
    })
    if (isLocal) {
      if (
        !this.credentials.authTokenOne ||
        !this.credentials.authTokenTwo ||
        !this.credentials.authTokenOneExpiry ||
        !this.credentials.authTokenTwoExpiry
      ) {
        throw new Error(
          'Auth tokens are required when running WhatsApp client locally'
        )
      }
      this.authTokenOneObj = {
        token: this.credentials.authTokenOne,
        expiry: new Date(this.credentials.authTokenOneExpiry),
      }
      this.authTokenTwoObj = {
        token: this.credentials.authTokenTwo,
        expiry: new Date(this.credentials.authTokenTwoExpiry),
      }
      this.isLocal = true
    }
  }

  private async getCredentials(
    apiClient: WhatsAppTemplateMessageToSend['apiClient']
  ): Promise<{
    token: string
    url: string
  }> {
    if (!this.isLocal) await this.checkAndRefreshTokens()
    if (!this.authTokenOneObj || !this.authTokenTwoObj) {
      throw new Error('Auth tokens not found')
    }
    if (this.authTokenOneObj.expiry.getTime() < new Date().getTime()) {
      throw new Error('Auth token one has expired')
    }
    if (this.authTokenTwoObj.expiry.getTime() < new Date().getTime()) {
      throw new Error('Auth token two has expired')
    }
    switch (apiClient) {
      case WhatsAppApiClient.clientOne:
        return {
          token: this.authTokenOneObj.token,
          url: this.credentials['onPremClientOneUrl'],
        }
      case WhatsAppApiClient.clientTwo:
        return {
          token: this.authTokenTwoObj.token,
          url: this.credentials['onPremClientTwoUrl'],
        }
    }
  }
  private async checkAndRefreshTokens() {
    const lessThanThreeDays = (tokenDate: Date) => {
      const now = new Date()
      const diff = now.getTime() - tokenDate.getTime()
      const days = diff / (1000 * 3600 * 24)
      return days < 3
    }
    const refreshAuthTokenOne =
      !this.authTokenOneObj || lessThanThreeDays(this.authTokenOneObj.expiry)
    const refreshAuthTokenTwo =
      !this.authTokenTwoObj || lessThanThreeDays(this.authTokenTwoObj.expiry)
    await Promise.all([
      refreshAuthTokenOne && this.refreshAuthTokens('1'),
      refreshAuthTokenTwo && this.refreshAuthTokens('2'),
    ])
  }
  private async refreshAuthTokens(client: '1' | '2') {
    const {
      data: { users },
    } = await this.axiosInstance.request<UsersLogin200Response>({
      method: 'post',
      url: AUTH_ENDPOINT,
      baseURL:
        client === '1'
          ? this.credentials['onPremClientOneUrl']
          : this.credentials['onPremClientTwoUrl'],
      headers: {
        Authorization: `Basic ${
          client === '1'
            ? this.credentials.adminCredentialsOne
            : this.credentials.adminCredentialsTwo
        }`,
      },
      data: {},
    })
    const { token, expires_after: expiresAfter } = users[0]
    const authToken = {
      token,
      expiry: new Date(expiresAfter),
    }
    client === '1'
      ? (this.authTokenOneObj = authToken)
      : (this.authTokenTwoObj = authToken)
    return
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
    const { token, url } = await this.getCredentials(input.apiClient)
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
    const { token: tokenOne, url: urlOne } = await this.getCredentials(
      WhatsAppApiClient.clientOne
    )
    const { token: tokenTwo, url: urlTwo } = await this.getCredentials(
      WhatsAppApiClient.clientTwo
    )
    const clientOneRecipients = inputs
      .filter((i) => i.apiClient === WhatsAppApiClient.clientOne)
      .map((i) => i.recipient)
    const clientTwoRecipients = inputs
      .filter((i) => i.apiClient === WhatsAppApiClient.clientTwo)
      .map((i) => i.recipient)
    const [validatedClientOneData, validatedClientTwoData] = await Promise.all([
      clientOneRecipients.length > 0
        ? this.axiosInstance.request<ValidateContact200Response>({
            method: 'post',
            url: CONTACT_ENDPOINT,
            baseURL: urlOne,
            headers: { Authorization: `Bearer ${tokenOne}` },
            data: { blocking: 'wait', contacts: clientOneRecipients },
          })
        : { data: { contacts: [] } },
      clientTwoRecipients.length > 0
        ? this.axiosInstance.request<ValidateContact200Response>({
            method: 'post',
            url: CONTACT_ENDPOINT,
            baseURL: urlTwo,
            headers: { Authorization: `Bearer ${tokenTwo}` },
            data: { blocking: 'wait', contacts: clientTwoRecipients },
          })
        : { data: { contacts: [] } },
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

  public async sendTemplateMessage(
    input: WhatsAppTemplateMessageToSend,
    isLocal = false
  ): Promise<MessageId> {
    const { token, url } = await this.getCredentials(input.apiClient)
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
            components: [
              {
                type: 'body',
                parameters: input.params,
              },
            ],
          },
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
            `Error sending template message ${JSON.stringify(
              input
            )}.\n Errors encountered: ${JSON.stringify(errors)}`
          )
        }
        throw new Error(
          `Unexpected error while sending template message. Input: ${JSON.stringify(
            input
          )}, Error: ${JSON.stringify(err)}`
        )
      })
    return messages[0].id
  }

  public async sendTextMessage(
    input: WhatsAppTextMessageToSend
  ): Promise<MessageId> {
    const { token, url } = await this.getCredentials(input.apiClient)
    const {
      data: { messages },
    } = await this.axiosInstance
      // not sure about this generic, might need to fix later
      .request<TemplateMessage200Response>({
        method: 'post',
        url: MESSAGE_ENDPOINT,
        baseURL: url,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          to: input.recipient,
          type: 'text',
          text: {
            body: input.body,
          },
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
            `Error sending text message ${JSON.stringify(
              input
            )}.\n Errors countered: ${JSON.stringify(errors)}`
          )
        }
        throw new Error(
          `Unexpected error while sending text message. Input: ${JSON.stringify(
            input
          )}, Error: ${JSON.stringify(err)}`
        )
      })
    return messages[0].id
  }

  public static transformNamedParams(
    params: { [key: string]: string },
    paramOrder: string[]
  ): NormalisedParam[] {
    return paramOrder.map((k) => ({
      type: 'text',
      text: params[k],
    }))
  }
}
