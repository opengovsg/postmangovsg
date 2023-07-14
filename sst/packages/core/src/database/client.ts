import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

interface Options {
  max: number // max number of connections
}

export default class PostmanDbClient {
  private client: PostgresJsDatabase<Record<string, never>>
  constructor(dbUri: string, options?: Options) {
    this.client = drizzle(postgres(dbUri, options))
  }

  public getClient() {
    return this.client
  }
}
