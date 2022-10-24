import config from '@core/config'
import { configureEndpoint } from '@core/utils/aws-endpoint'
import AWS from 'aws-sdk'
import { Config } from 'sequelize'

const rdsSigner = new AWS.RDS.Signer(configureEndpoint(config))

export type MutableConfig = {
  -readonly [K in keyof Config]: Config[K]
}

/**
 * Generate an RDS authentication token using attached IAM role
 * @param config
 */
export const generateRdsIamAuthToken = async (
  config: MutableConfig
): Promise<string> => {
  const { username, port, host } = config

  // getAuthToken is called asynchronously because we are using an asynchronous credential provider
  // (EC2 IAM roles). As such we cannot guarantee to have resolved credentials at this point.
  return new Promise((resolve, reject) => {
    rdsSigner.getAuthToken(
      {
        hostname: host,
        port: port ? +port : 5432,
        username,
      },
      (err, token) => {
        if (err) return reject(err)
        resolve(token)
      }
    )
  })
}
