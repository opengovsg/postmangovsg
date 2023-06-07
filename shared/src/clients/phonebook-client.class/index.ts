import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import * as http from 'http'

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

  private request<TBody>(
    options: AxiosRequestConfig<TBody>,
    body?: TBody
  ): Promise<AxiosResponse> {
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
      throw new Error('Could not get managed lists')
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
      throw new Error('Could not get managed list by id')
    }
  }
}
