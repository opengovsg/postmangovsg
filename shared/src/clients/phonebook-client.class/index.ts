import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import * as http from 'http'
import {
  GetUniqueLinksRequestDto,
  GetUniqueLinksResponseDto,
} from './interfaces'

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

  request<TData, TBody = any>(
    options: AxiosRequestConfig<TBody>,
    body?: TBody
  ) {
    const defaultOptions: AxiosRequestConfig = {
      method: 'post', // default method will be post
    }
    const requestConfig = body
      ? { ...defaultOptions, ...options, data: { ...body } }
      : { ...defaultOptions, ...options }
    return this.client.request<TData, AxiosResponse<TData>, TBody>(
      requestConfig
    )
  }

  public async getManagedLists(email: string, channel: string) {
    try {
      const res = await this.request<{ id: number; name: string }[]>({
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

  public async getManagedListById(listId: number, presignedUrl: string) {
    try {
      const res = await this.request<{
        s3Key: string
        etag: string
        filename: string
      }>(
        {
          method: 'post',
          url: `/managed-list/${listId}/members/s3`,
        },
        {
          presignedUrl,
        }
      )
      return res.data
    } catch (err) {
      throw new Error('Could not get managed list by id')
    }
  }

  public async getUniqueLinksForUsers(body: GetUniqueLinksRequestDto) {
    try {
      const res = await this.request<GetUniqueLinksResponseDto[]>(
        {
          method: 'post',
          url: '/public-user/unique-links',
        },
        body
      )
      return res.data
    } catch (err) {
      throw new Error('Could not get unique links for users')
    }
  }
}
