import AWS from 'aws-sdk'
import config from '../config'
import { configureEndpoint } from './aws-endpoint'

const rdsSigner = new AWS.RDS.Signer(configureEndpoint(config))

/**
 * Generate an RDS authentication token using attached IAM role
 * @param dbConfig
 */
export const generateRdsIamAuthToken = async (dbConfig: {
  username: string
  port: number
  hostname: string
}): Promise<string> => {
  const { username, port, hostname } = dbConfig

  // getAuthToken is called asynchronously because we are using an asynchronous credential provider
  // (EC2 IAM roles). As such we cannot guarantee to have resolved credentials at this point.
  return new Promise((resolve, reject) => {
    rdsSigner.getAuthToken(
      {
        hostname,
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
