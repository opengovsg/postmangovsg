import AWS from 'aws-sdk'
import { QueryTypes } from 'sequelize'

import config from './config'
import { getSequelize } from './sequelize-loader'
import { Logger } from './utils/logger'
import { configureEndpoint } from './utils/aws-endpoint'

const logger = new Logger('cleanup')
const secretsManager = new AWS.SecretsManager(configureEndpoint(config))

/**
 * Remove secret from secret manager if secret exists
 * @param secretId
 * @param dryRun Whether actual removal should execute
 */
const deleteFromSecretManager = async (
  secretId: string,
  dryRun: boolean
): Promise<void> => {
  try {
    const secret = await secretsManager
      .describeSecret({ SecretId: secretId })
      .promise()

    if (!dryRun) {
      secretsManager.deleteSecret({
        RecoveryWindowInDays: 7, // This is default.
        SecretId: secretId,
      })
    }

    logger.log(`[${secret.Name}] Sucessfully removed from Secret Manager.`)
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      logger.error(
        `[${secretId}] Failed to remove from Secrets Manager. ${secretId} does not exists.`
      )
    } else {
      throw err
    }
  }
}

/**
 * Delete credentials from database
 * @param credentialName
 * @param dryRun Whether credentials should be removed from database
 */
const deleteFromDb = async (
  credentialName: string,
  dryRun: boolean
): Promise<void> => {
  const sequelize = await getSequelize()
  // Remove from database
  if (!dryRun) {
    sequelize.query(`DELETE FROM credentials WHERE name = :credentialName`, {
      replacements: { credentialName },
      type: QueryTypes.DELETE,
    })
  }
  logger.log(`[${credentialName}] Successfully removed from credentials table.`)
}

/**
 * Remove secrets from both database and secrets manager
 */
export const removeCredentials = async (
  secretIds: string[],
  dryRun: boolean
): Promise<void> => {
  for (const secretId of secretIds) {
    // Remove from database
    await deleteFromDb(secretId, dryRun)

    // Remove from secrets manager
    await deleteFromSecretManager(secretId, dryRun)
  }
}

/**
 * Get credentials in database that are not associated to a user
 */
export const getDbCredentialsWithoutUsers = async (): Promise<
  Array<string>
> => {
  const sequelize = await getSequelize()

  // Select credentials that are not associated to a user and is not a demo/default credential
  const results = await sequelize.query(`
    SELECT
      name
    FROM
      credentials
      LEFT OUTER JOIN user_credentials ON credentials.name = user_credentials.cred_name
    WHERE
      LOWER(credentials.name) NOT SIMILAR TO '%_(default|demo)'
      AND user_id IS NULL
  `)

  const credentials = results[0]
    .filter((c: any): c is { name: string } => c.name !== undefined)
    .map((c) => c.name)

  return credentials
}
