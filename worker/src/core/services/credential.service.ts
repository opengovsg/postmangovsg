import AWS from 'aws-sdk'
import { loggerWithLabel } from '@core/logger'
import config from '@core/config'
import { TwilioCredentials } from '@sms/interfaces'
import { TelegramCredentials } from '@telegram/interfaces'
import { get } from 'lodash'
import { configureEndpoint } from '@core/utils/aws-endpoint'

const logger = loggerWithLabel(module)
const secretsManager = new AWS.SecretsManager(configureEndpoint(config))

const getCredentialsFromSecretsManager = async (name: string): Promise<any> => {
  logger.info({
    message: 'Getting secret from AWS secrets manager.',
    name,
    action: 'getCredentialsFromSecretsManager',
  })
  const data = await secretsManager.getSecretValue({ SecretId: name }).promise()
  logger.info({
    message: 'Retreived secret from AWS secrets manager.',
    name,
    action: 'getCredentialsFromSecretsManager',
  })
  const secretString = get(data, 'SecretString', '')
  if (!secretString)
    throw new Error('Missing secret string from AWS secrets manager.')

  // Secrets may be JSON objects or plain strings, handle both
  try {
    const parsedSecret = JSON.parse(secretString)
    return parsedSecret
  } catch {
    return secretString
  }
}

const getTwilioCredentials = async (
  name: string
): Promise<TwilioCredentials> => {
  return await getCredentialsFromSecretsManager(name)
}

const getTelegramCredentials = async (
  name: string
): Promise<TelegramCredentials> => {
  return await getCredentialsFromSecretsManager(name)
}

export const CredentialService = {
  getTwilioCredentials,
  getTelegramCredentials,
}
