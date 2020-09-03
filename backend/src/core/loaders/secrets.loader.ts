import logger from '@core/logger'
import config from '@core/config'
import AWS from 'aws-sdk'
import { configureEndpoint } from '@core/utils/aws-endpoint'

const secretsLoader = async (): Promise<void> => {
  const secretsManager = new AWS.SecretsManager(configureEndpoint(config))
  try {
    const data = await secretsManager
      .getSecretValue({ SecretId: config.get('aws.configSecretName') })
      .promise()
    const secretString = data.SecretString
    if (secretString === undefined)
      throw new Error('Secret string from AWS Secrets Manager is undefined.')
    const {
      databaseUri,
      databaseReadReplicaUri,
      sessionSecret,
      redisOtpUri,
      redisSessionUri,
      jwtSecret,
      secretManagerSalt,
      apiKeySaltV1,
      unsubscribeHmacKeyV1,
    } = JSON.parse(secretString)

    config.set('database.databaseUri', databaseUri)
    config.set('database.databaseReadReplicaUri', databaseReadReplicaUri)
    config.set('session.secret', sessionSecret)
    config.set('redisOtpUri', redisOtpUri)
    config.set('redisSessionUri', redisSessionUri)
    config.set('jwtSecret', jwtSecret)
    config.set('aws.secretManagerSalt', secretManagerSalt)
    config.set('apiKey.salt', apiKeySaltV1)
    config.set('unsubscribeHmac.v1.key', unsubscribeHmacKeyV1)
  } catch (err) {
    process.exit(1)
  }
  // Validate to make sure all the required env vars have been set
  config.validate()

  logger.info({ message: 'Secrets loaded' })
}

export default secretsLoader
