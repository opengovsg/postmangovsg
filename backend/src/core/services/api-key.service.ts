import bcrypt from 'bcrypt'
import crypto from 'crypto'
import config from '@core/config'
import { User } from '@shared/core/models/user'
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

const regenerateAndSaveApiKey = async (user: User): Promise<string> => {
  const name = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')
  const apiKeyPlainText = ApiKeyService.generateApiKeyFromName(name)
  user.apiKeyHash = await ApiKeyService.getApiKeyHash(apiKeyPlainText)
  await user.save()
  return apiKeyPlainText
}

export const ApiKeyService = {
  generateApiKeyFromName,
  getApiKeyHash,
  regenerateAndSaveApiKey,
}
