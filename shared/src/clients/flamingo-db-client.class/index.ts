import { WhatsAppApiClient } from '../whatsapp-client.class/interfaces'

export interface SequelizeQueryClient {
  query: <T>(
    sql: string | { query: string; values: unknown[] },
    options: {
      replacements: { [key: string]: unknown }
      type: 'SELECT'
    }
  ) => Promise<T[]>
}
export default class FlamingoDbClient {
  private client: SequelizeQueryClient
  constructor(dbQueryClient: SequelizeQueryClient) {
    this.client = dbQueryClient
  }
  public async getApiClientId(phoneNumbers: string[]) {
    if (phoneNumbers.length === 0) {
      return new Map<string, WhatsAppApiClient>()
    }
    interface QueryResult {
      apiClientId: number
      phoneNumber: string
    }
    const parameterizedQuery = `SELECT
                                  whatsapp_subscribers."apiClientId",
                                  whatsapp_subscribers."phoneNumber"
                                FROM
                                  whatsapp_subscribers
                                WHERE
                                  "phoneNumber" IN (:phoneNumbers)`
    const results = await this.client.query<QueryResult>(parameterizedQuery, {
      replacements: { phoneNumbers },
      type: 'SELECT',
    })
    const resultMap = new Map<string, WhatsAppApiClient>()
    results.forEach((res) => {
      resultMap.set(
        res.phoneNumber,
        res.apiClientId === 1
          ? WhatsAppApiClient.clientOne
          : WhatsAppApiClient.clientTwo
      )
    })
    // NB if a phone number is not found in the db, it will not be in the map
    // when calling .get() on the map, it will return undefined
    return resultMap
  }
}
