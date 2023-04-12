import { WhatsappCredentials } from './interfaces'
import https, { RequestOptions } from 'https'

export default class WhatsappClient {
  private bearerToken: string
  private baseUrl: string
  private version: string
  constructor(credential: WhatsappCredentials) {
    this.bearerToken = credential.bearerToken
    this.baseUrl = credential.baseUrl
    this.version = credential.version
  }

  // This function wraps our requests with some default options
  private request(options: RequestOptions, body?: any): Promise<any> {
    options.path = `/v${this.version}/${options.path}`
    const defaultOptions: RequestOptions = {
      method: 'POST', // default method will be post
      host: this.buildHost(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.bearerToken}`,
      },
    }

    return new Promise((resolve, reject) => {
      const req = https.request({ ...defaultOptions, ...options }, (res) => {
        let data = ''
        // A chunk of data has been received.
        res.on('data', (chunk) => {
          data += chunk
        })

        // The whole response has been received. Print out the result.
        res.on('end', () => {
          // parse the data
          resolve(JSON.parse(data))
        })
        res.on('error', (err) => {
          reject(`HTTP call failed ${err.message}`)
        })
      })
      if (body) {
        req.write(JSON.stringify({ messaging_product: 'whatsapp', ...body }))
      }
      req.end()
    })
  }

  // change this if graphAPI changes its api format
  private buildHost(): string {
    return this.baseUrl
  }

  public sendMessage(from: string, to: string, body: any): Promise<string> {
    const resolution = this.request(
      {
        method: 'POST',
        path: `${from}/messages`,
      },
      { to, ...body }
    )
    return new Promise((resolve, reject) => {
      void resolution.then((res) => {
        if (!res.error) {
          resolve(res)
        } else {
          reject(res)
        }
      })
    })
  }
}
