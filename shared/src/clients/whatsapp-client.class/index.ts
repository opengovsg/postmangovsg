import {
  WhatsappCredentials,
  WhatsappPhoneNumber,
  WhatsappTemplate,
  WhatsappTemplateStatus,
} from './interfaces'
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

export default class WhatsappClient {
  private bearerToken: string
  private baseUrl: string
  private version: string
  private axiosClient: AxiosInstance
  constructor(credential: WhatsappCredentials) {
    this.bearerToken = credential.bearerToken
    this.baseUrl = credential.baseUrl
    this.version = credential.version
    this.axiosClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.bearerToken}`,
      },
    })
  }

  // This function wraps our requests with some default options
  private request(options: AxiosRequestConfig, body?: any): Promise<any> {
    // replace path with the version, as this is how graph API wants it
    options.url = `/v${this.version}/${options.url}`
    const defaultOptions: AxiosRequestConfig = {
      method: 'post', // default method will be post
    }
    if (body) {
      body.messaging_product = 'whatsapp'
    }
    return this.axiosClient
      .request({
        ...defaultOptions,
        ...options,
        data: { ...body },
      })
      .then((res) => {
        return res.data
      })
  }

  public async sendMessage(
    from: string,
    to: string,
    body: any
  ): Promise<string> {
    const res = await this.request(
      {
        method: 'post',
        url: `${from}/messages`,
      },
      { to, ...body }
    ).catch((e) => {
      // this would mean whatsapp server is down
      throw new Error(e)
    })
    // even if whatsapp returned an error, it would still have status code: 200
    // we must check for the error object instead
    if (res.error) {
      throw new Error(res)
    }
    return res.messages[0].id
  }

  public async getTemplates(wabaId: string): Promise<WhatsappTemplate[]> {
    const res = await this.request({
      method: 'get',
      url: `${wabaId}/message_templates`,
    }).catch((e) => {
      // this would mean whatsapp server is down
      throw new Error(e)
    })
    // even if whatsapp returned an error, it would still have status code: 200
    // we must check for the error object instead
    if (res.error) {
      throw new Error(res)
    }
    return (res.data as WhatsappTemplate[]).filter(
      (t: { status: WhatsappTemplateStatus }) =>
        t.status !== WhatsappTemplateStatus.REJECTED
    )
  }

  public async getPhoneNumbers(wabaId: string): Promise<WhatsappPhoneNumber[]> {
    const res = await this.request({
      method: 'get',
      url: `${wabaId}/phone_numbers`,
    }).catch((e) => {
      throw new Error(e)
    })
    if (res.error) {
      throw new Error(res)
    }
    return res.data
  }
}