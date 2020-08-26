import logger from '@core/logger'
import config from '@core/config'
import AWS from 'aws-sdk'

const REGION = 'ap-southeast-1'
const NAME = 'develop/shaowei/test'

const secretsLoader = async (): Promise<void> => {
  const secretsManager = new AWS.SecretsManager({
    region: REGION,
  })
  try {
    const data = await secretsManager
      .getSecretValue({ SecretId: NAME })
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

    config.set('aws.secretManagerSalt', secretManagerSalt)
    config.set('database.databaseUri', databaseUri)
    config.set('database.databaseReadReplicaUri', databaseReadReplicaUri)
    config.set('jwtSecret', jwtSecret)
    config.set('session.secret', sessionSecret)
    config.set('redisOtpUri', redisOtpUri)
    config.set('redisSessionUri', redisSessionUri)
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
