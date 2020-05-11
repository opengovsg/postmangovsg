import bcrypt from 'bcrypt'
import crypto from 'crypto'
import config from '@core/config'

const generateApiKey = (email: string): string => {
  const name = email.split('@')[0].replace(/\W/g, '')
  const randomString = crypto.randomBytes(32).toString('base64')
  return `${name}_${config.apiKey.version}_${randomString}`
}

const getApiKeyHash = async (apiKey: string): Promise<string> => {
  const [name, version, key] = apiKey.split('_')
  const hash = await bcrypt.hash(key, config.apiKey.salt)
  const apiKeyHash = `${name}_${version}_${hash.replace(config.apiKey.salt, '')}`
  return apiKeyHash
}

export {
  generateApiKey,
  getApiKeyHash,
}