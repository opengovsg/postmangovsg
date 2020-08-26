import logger from '@core/logger'
import config from '@core/config'
import AWS from 'aws-sdk'

const REGION = 'ap-southeast-1'
const NAME = 'develop/shaowei/test'

const secretsLoader = async (): Promise<void> => {
  const client = new AWS.SecretsManager({
    region: REGION,
  })
  try {
    const data = await client.getSecretValue({ SecretId: NAME }).promise()
    config.set('test', data.SecretString)
  } catch (err) {
    process.exit(1)
  }
  // Validate to make sure all the required env vars have been set
  config.validate()

  logger.info({ message: 'Secrets loaded' })
}

export default secretsLoader
