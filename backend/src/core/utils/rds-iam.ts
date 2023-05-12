import { Signer } from '@aws-sdk/rds-signer'
import { Config } from 'sequelize'

import config from '@core/config'
import { configureEndpoint } from '@core/utils/aws-endpoint'

const endpointConfig = configureEndpoint(config)

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

  const signer = new Signer({
    ...endpointConfig,
    hostname: host as string,
    port: port ? +port : 5432,
    username,
  })
  return signer.getAuthToken()
}
