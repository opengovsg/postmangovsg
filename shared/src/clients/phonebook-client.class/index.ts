import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { PhonebookChannelDto } from './interfaces'

export default class PhonebookClient {
  private client: AxiosInstance
  private baseUrl: string
  private apiKey: string
  private version: string

  constructor(baseUrl: string, apiKey: string, version: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.version = version
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
    })
  }

  private request(options: AxiosRequestConfig, body?: any): Promise<any> {
    options.url = `/api/v${this.version}/${options.url}`
    const defaultOptions: AxiosRequestConfig = {
      method: 'post', // default method will be post
    }
    return this.client.request({
      ...defaultOptions,
      ...options,
      data: { ...body },
    })
  }

  public async getManagedLists(email: string, channel: string) {
    try {
      const res = await this.request({
        method: 'get',
        url: `managed-list`,
        params: {
          owner: email,
          channel,
        },
      })
      return res.data
    } catch (err) {
      throw new Error(err as any)
    }
  }

  public async getManagedListById(listId: number) {
    try {
      const res = await this.request({
        method: 'get',
        url: `managed-list/${listId}/members/s3`,
      })
      return res.data
    } catch (err) {
      throw new Error(err as any)
    }
  }

  public async getUniqueLinksForUsers(body: PhonebookChannelDto) {
    try {
      const res = await this.request(
        {
          method: 'post',
          url: 'public-user/unique_links',
        },
        body
      )
      return res.data
    } catch (err) {
      throw new Error(err as any)
    }
  }
}
