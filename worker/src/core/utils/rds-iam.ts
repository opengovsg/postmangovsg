import { Signer } from '@aws-sdk/rds-signer'
import { Config } from 'sequelize'
import config from '@core/config'

export type MutableConfig = {
  -readonly [K in keyof Config]: Config[K]
}

/**
 * Generate an RDS authentication token using attached IAM role
 * @param config
 */
export const generateRdsIamAuthToken = async (
  mConfig: MutableConfig
): Promise<string> => {
  const { username, port, host } = mConfig
  const rdsSigner = new Signer({
    region: config.get('aws.awsRegion'),
    hostname: host as string,
    port: port ? +port : 5432,
    username,
  })
  return rdsSigner.getAuthToken()
}
