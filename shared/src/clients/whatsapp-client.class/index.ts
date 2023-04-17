import { WhatsappCredentials, WhatsappTemplate } from './interfaces'
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

  public sendMessage(from: string, to: string, body: any): Promise<string> {
    const resolution = this.request(
      {
        method: 'POST',
        path: `${from}/messages`,
      },
      { to, ...body }
    )
    // tentatively hold it in promise, so we can extract out campaign id and do operations if we want to
    // such as callback status and stuff
    return new Promise((resolve, reject) => {
      void resolution.then((res) => {
        // graphAPI docs state that even for errors, it would return status 200 but have an error object
        // so we check for error object instead of http status.
        if (!res.error) {
          resolve(res)
        } else {
          reject(res)
        }
      })
    })
  }

  public getTemplates(wabaId: string): Promise<WhatsappTemplate[]> {
    const resolution = this.request({
      method: 'GET',
      path: `${wabaId}/message_templates`,
    })
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
