import { parse } from 'pg-connection-string'

import config from '@core/config'

export const parseDBUri = (uri: string): any => {
  const config = parse(uri)
  return { ...config, username: config.user }
}

const DB_URI = config.get('database.databaseUri')
export const dbConfig = parseDBUri(DB_URI)
