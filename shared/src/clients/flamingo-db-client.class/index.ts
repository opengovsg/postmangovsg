import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import { whatsappSubscribers } from './whatsapp-subscriber'
import { eq } from 'drizzle-orm'

export default class FlamingoDbClient {
  private dbUri: string
  private db: NodePgDatabase | null = null
  constructor(dbUri: string) {
    this.dbUri = dbUri
  }

  private async getDb(): Promise<NodePgDatabase> {
    if (this.db) {
      return this.db
    }
    const client = new Client({
      connectionString: this.dbUri,
      ssl: {
        // required to connect to flamingo db
        rejectUnauthorized: false,
      },
    })
    await client.connect()
    this.db = drizzle(client)
    return this.db
  }
  public async getAssociatedApiClientId(
    phoneNumber: string
  ): Promise<number | null> {
    const db = await this.getDb()
    const result = await db
      .select({
        apiClientId: whatsappSubscribers.apiClientId,
      })
      .from(whatsappSubscribers)
      .where(eq(whatsappSubscribers.phoneNumber, phoneNumber))
    return result.length === 0 ? null : result[0].apiClientId
  }
}
