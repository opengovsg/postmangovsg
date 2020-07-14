import AWS from 'aws-sdk'
import logger from '@core/logger'
import config from '@core/config'
import { TwilioCredentials } from '@sms/interfaces'
import { TelegramCredentials } from '@telegram/interfaces'
import { get } from 'lodash'

const secretsManager = new AWS.SecretsManager({
  region: config.get('aws.awsRegion'),
})

const getCredentialsFromSecretsManager = async (name: string): Promise<any> => {
  logger.info('Getting secret from AWS secrets manager.')
  const data = await secretsManager.getSecretValue({ SecretId: name }).promise()
  logger.info('Gotten secret from AWS secrets manager.')
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
  if (!config.get('IS_PROD')) {
    logger.info(
      `Dev env - getTwilioCredentials - returning default credentials for name=${name}`
    )
    return config.get('smsOptions')
  }
  return await getCredentialsFromSecretsManager(name)
}

const getTelegramCredentials = async (
  name: string
): Promise<TelegramCredentials> => {
  if (!config.get('IS_PROD')) {
    logger.info(
      `Dev env - getTelegramCredentials - returning default credentials for name=${name}`
    )
    return config.get('telegramBotToken')
  }
  return await getCredentialsFromSecretsManager(name)
}

export const CredentialService = {
  getTwilioCredentials,
  getTelegramCredentials,
}
