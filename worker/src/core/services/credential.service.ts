import AWS from 'aws-sdk'
import logger from '@core/logger'
import config from '@core/config'
import { TwilioCredentials } from '@sms/interfaces'
import { get } from 'lodash'

const secretsManager = new AWS.SecretsManager({
  region: config.get('aws.awsRegion'),
})

const getTwilioCredentials = async (
  name: string
): Promise<TwilioCredentials> => {
  if (!config.get('IS_PROD')) {
    logger.info(
      `Dev env - getTwilioCredentials - returning default credentials for name=${name}`
    )
    return config.get('smsOptions')
  }
  logger.info('Getting secret from AWS secrets manager.')
  const data = await secretsManager.getSecretValue({ SecretId: name }).promise()
  logger.info('Gotten secret from AWS secrets manager.')
  const secretString = get(data, 'SecretString', '')
  if (!secretString)
    throw new Error('Missing secret string from AWS secrets manager.')
  return JSON.parse(secretString)
}

export const CredentialService = {
  getTwilioCredentials,
}
