import bcrypt from 'bcrypt'
import crypto from 'crypto'
import config from '@core/config'
import { ApiKey } from '@core/models'

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

const hasValidApiKey = async (userId: string): Promise<boolean> => {
  const apiKeyRecord = await ApiKey.findOne({
    where: {
      userId,
    },
  })
  return !!apiKeyRecord
}

const getApiKeyRecord = async (hash: string): Promise<ApiKey | null> => {
  // In future, add validity date and status checks as well here
  return await ApiKey.findOne({
    where: {
      hash,
    },
  })
}

const getApiKeys = async (userId: string): Promise<ApiKey[]> => {
  return ApiKey.findAll({
    where: {
      userId,
    },
    order: [['createdAt', 'DESC']],
  })
}

const deleteApiKey = async (
  userId: string,
  apiKeyId: number
): Promise<number> => {
  return await ApiKey.destroy({
    where: {
      id: apiKeyId,
      userId,
    },
  })
}

export const ApiKeyService = {
  generateApiKeyFromName,
  getApiKeyHash,
  hasValidApiKey,
  getApiKeyRecord,
  getApiKeys,
  deleteApiKey,
}
