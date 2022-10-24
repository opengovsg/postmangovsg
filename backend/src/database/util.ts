import config from '@core/config'
import { parse } from 'pg-connection-string'

export const parseDBUri = (uri: string): any => {
  const config = parse(uri)
  return { ...config, username: config.user }
}

const DB_URI = config.get('database.databaseUri')
export const dbConfig = parseDBUri(DB_URI)
