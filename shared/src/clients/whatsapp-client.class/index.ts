import { WhatsappCredentials } from './interfaces'
import https, { RequestOptions } from 'https'

export default class WhatsappClient {
  private bearerToken: string
  private baseUrl: string
  private version: number
  constructor(credential: WhatsappCredentials) {
    this.bearerToken = credential.bearerToken
    this.baseUrl = credential.baseUrl
    this.version = credential.version
  }

  // This function wraps our requests with some default options
  private request(options: RequestOptions): Promise<any> {
    const defaultOptions: RequestOptions = {
      method: 'POST', // default method will be post
      host: this.buildHost(),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=UTF-8',
      },
      auth: `Bearer ${this.bearerToken}`,
    }
    https.request({ ...defaultOptions, ...options })
    return Promise.reject('')
  }

  // change this if graphAPI changes its api format
  private buildHost(): string {
    return this.baseUrl + '/v' + this.version
  }

  public sendMessage(): Promise<string | void> {
    return this.request({})
  }
}
