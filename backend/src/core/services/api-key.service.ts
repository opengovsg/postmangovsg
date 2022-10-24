import config from '@core/config'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

/**
 * Generates a random base64 string as an api key
 * @param name
 */
const generateApiKeyFromName = (name: string): string => {
  const randomString = crypto.randomBytes(32).toString('base64')
  return `${name}_${config.get('apiKey.version')}_${randomString}`
}

/**
 * Given an api key, extract the key for hashing
 * @param apiKey
 */
const getApiKeyHash = async (apiKey: string): Promise<string> => {
  const [name, version, key] = apiKey.split('_')
  const hash = await bcrypt.hash(key, config.get('apiKey.salt'))
  const apiKeyHash = `${name}_${version}_${hash.replace(
    config.get('apiKey.salt'),
    ''
  )}`
  return apiKeyHash
}

export const ApiKeyService = {
  generateApiKeyFromName,
  getApiKeyHash,
}
