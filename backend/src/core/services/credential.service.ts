import AWS from 'aws-sdk'
import { Credential } from '@core/models'
import logger from '@core/logger'
import config from '@core/config'
import { TwilioCredentials } from '@sms/interfaces'
import { get } from 'lodash'

const secretsManager = new AWS.SecretsManager({ region: config.aws.awsRegion })

const isExistingCredential = async (name: string): Promise<boolean> => {
  const result = await Credential.findOne({
    where: {
      name: name,
    },
  })
  return !!result
}

const storeCredential = async (name: string, secret: string): Promise<void> => {
  if (!config.IS_PROD) {
    logger.info(`Dev env - storeSecret - skipping for name=${name}`)
    return
  }

  // If credentials exists, skip
  if (await isExistingCredential(name)) {
    return
  }

  const params = {
    Name: name,
    SecretString: secret,
  }
  logger.info('Storing credential in AWS secrets manager')
  await secretsManager.createSecret(params).promise()
  logger.info('Successfully stored credential in AWS secrets manager')
  logger.info('Storing credential in DB')
  await Credential.findCreateFind({
    where: { name },
  })
  logger.info('Successfully stored credential in DB')
}

const getTwilioCredentials = async (name: string): Promise<TwilioCredentials> => {
  if (!config.IS_PROD) {
    logger.info(`Dev env - getTwilioCredentials - returning default credentials for name=${name}`)
    return config.smsOptions
  }
  logger.info('Getting secret from AWS secrets manager.')
  const data = await secretsManager.getSecretValue({ SecretId: name }).promise()
  logger.info('Gotten secret from AWS secrets manager.')
  const secretString = get(data, 'SecretString', '')
  if (!secretString) throw new Error('Missing secret string from AWS secrets manager.')
  return JSON.parse(secretString)
}

export const credentialService = {
  storeCredential,
  getTwilioCredentials,
}