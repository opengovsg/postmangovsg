import AWS from 'aws-sdk'
import { Config } from 'sequelize'

import config from '@core/config'
import { configureEndpoint } from '@core/utils/aws-endpoint'

const rdsSigner = new AWS.RDS.Signer(configureEndpoint(config))

export type MutableConfig = {
  -readonly [K in keyof Config]: Config[K]
}

export const generateRdsIamAuthToken = async (config: any): Promise<string> => {
  const { username, port, host } = config

  // getAuthToken is called asynchronously because we are using an asynchronous credential provider
  // (EC2 IAM roles). As such we cannot guarantee to have resolved credentials at this point.
  return new Promise((resolve, reject) => {
    rdsSigner.getAuthToken(
      {
        hostname: host,
        port: +port,
        username,
      },
      (err, token) => {
        if (err) return reject(err)
        resolve(token)
      }
    )
  })
}
