import AWS from 'aws-sdk'
import logger from '@core/logger'

//TODO: Move this to env var 
const REGION = 'southeast ap'

const secretsManager = new AWS.SecretsManager({ region: REGION })

const storeSecret = async (name: string, secret: string) => {
  const params = {
    SecretId: name,
    SecretString: secret
  }
  logger.info('Storing secret in AWS secrets manager.')
  await secretsManager.putSecretValue(params).promise()
}



export const secretsService = {storeSecret}
