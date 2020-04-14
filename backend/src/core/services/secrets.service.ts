import AWS from 'aws-sdk'
import logger from '@core/logger'
import config from '@core/config'

const secretsManager = new AWS.SecretsManager({ region: config.aws.awsRegion })

const storeSecret = async (name: string, secret: string) => {
  const params = {
    Name: name,
    SecretString: secret
  }
  logger.info('Storing secret in AWS secrets manager.')
  await secretsManager.createSecret(params).promise()
  logger.info('Successfully stored secret in AWS secrets manager.')
}



export const secretsService = {storeSecret}
