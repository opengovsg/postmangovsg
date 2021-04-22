const { parse } = require('pg-connection-string')

const parseDBUri = (uri) => {
  const config = parse(uri)
  return { ...config, username: config.user }
}

const DB_URI =
  'postgres://postgres:postgres@localhost:5432/postmangovsg_dev_test'
const dbConfig = parseDBUri(DB_URI)

const COMMON_CONFIG = {
  dialect: 'postgres',
  ...dbConfig,
}

module.exports = {
  development: COMMON_CONFIG,
  staging: COMMON_CONFIG,
  production: COMMON_CONFIG,
}
