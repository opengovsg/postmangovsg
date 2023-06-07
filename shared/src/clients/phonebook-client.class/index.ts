import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import * as http from 'http'
import { PhonebookChannelDto, UserChannel } from './interfaces'

export default class PhonebookClient {
  private client: AxiosInstance
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      httpAgent: new http.Agent({ keepAlive: true }),
    })
  }

  private request(options: AxiosRequestConfig, body?: any): Promise<any> {
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
        url: `/managed-list`,
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
        url: `/managed-list/${listId}/members/s3`,
      })
      return res.data
    } catch (err) {
      throw new Error(err as any)
    }
  }

  public async getUniqueLinksForUsers(
    body: PhonebookChannelDto
  ): Promise<UserChannel[]> {
    try {
      const res = await this.request(
        {
          method: 'post',
          url: '/public-user/unique-links',
        },
        body
      )
      return res.data
    } catch (err) {
      throw new Error(err as any)
    }
  }
}
