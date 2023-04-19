import { WhatsappCredentials } from './interfaces'
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
      timeout: 1000,
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

  public async sendMessage(from: string, to: string, body: any) {
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
    return res
  }
}
