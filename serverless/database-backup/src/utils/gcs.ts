import AWS from 'aws-sdk'
import { Storage, StorageOptions } from '@google-cloud/storage'

import config from '../config'
import { configureEndpoint } from './aws-endpoint'

const secretsManager = new AWS.SecretsManager(configureEndpoint(config))

let storage: Storage | undefined

/**
 * Retrieve GCP credentials from AWS Secrets Manager
 */
const getGcpCredentials = async (): Promise<StorageOptions> => {
  const secretName = config.get('gcp.secretName')
  const secret = await secretsManager
    .getSecretValue({ SecretId: secretName })
    .promise()
  const secretString = secret.SecretString
  if (!secretString) {
    throw new Error('Missing secret from AWS Secrets Manager')
  }

  const { project_id, client_email, private_key } = JSON.parse(secretString)
  return {
    projectId: project_id,
    credentials: {
      client_email,
      private_key,
    },
  }
}

/**
 * Initialize and get instance of GCP Storage object
 */
const getStorage = async (): Promise<Storage> => {
  if (!storage) {
    storage = new Storage(
      config.get('gcp.appCredentials') ? {} : await getGcpCredentials()
    )
  }
  return storage
}

export { getStorage }
