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
    // replace path with the version, as this is how graph API wants it
    options.path = `/v${this.version}/${options.path}`
    const defaultOptions: RequestOptions = {
      method: 'POST', // default method will be post
      host: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.bearerToken}`,
      },
    }

    return new Promise((resolve, reject) => {
      const req = https.request({ ...defaultOptions, ...options }, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })

        // The whole response has been received
        res.on('end', () => {
          // parse the data
          resolve(JSON.parse(data))
        })
        res.on('error', (err) => {
          reject(`HTTP call failed ${err.message}`)
        })
      })
      // this portion is writing to the request body, not the response object
      if (body) {
        req.write(JSON.stringify({ messaging_product: 'whatsapp', ...body }))
      }
      req.end()
    })
  }

  public async sendMessage(from: string, to: string, body: any) {
    const res = await this.request(
      {
        method: 'POST',
        path: `${from}/messages`,
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
