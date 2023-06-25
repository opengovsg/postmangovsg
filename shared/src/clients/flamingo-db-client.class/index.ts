import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import { whatsappSubscribers } from './whatsapp-subscriber'
import { eq } from 'drizzle-orm'

export default class FlamingoDbClient {
  private dbUri: string
  constructor(dbUri: string) {
    this.dbUri = dbUri
  }

  private async initializeDb(): Promise<NodePgDatabase> {
    const client = new Client({
      connectionString: this.dbUri,
    })
    await client.connect()
    return drizzle(client)
  }
  public async getAssociatedApiClientId(
    phoneNumber: string
  ): Promise<number | null> {
    const db = await this.initializeDb()
    const result = await db
      .select({
        apiClientId: whatsappSubscribers.apiClientId,
      })
      .from(whatsappSubscribers)
      .where(eq(whatsappSubscribers.phoneNumber, phoneNumber))
    return result[0].apiClientId
  }
}
