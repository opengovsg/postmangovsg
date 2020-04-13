import AWS from 'aws-sdk'
import logger from '@core/logger'
import config from '@core/config'

const secretsManager = new AWS.SecretsManager({ region: config.aws.awsRegion })

const storeSecret = async (name: string, secret: string) => {
  const params = {
    SecretId: name,
    SecretString: secret
  }
  logger.info('Storing secret in AWS secrets manager.')
  await secretsManager.putSecretValue(params).promise()
}



export const secretsService = {storeSecret}
