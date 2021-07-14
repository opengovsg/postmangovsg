import AWS from 'aws-sdk'
import { QueryTypes, Transaction } from 'sequelize'
import { difference } from 'lodash'

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
      await secretsManager
        .deleteSecret({
          RecoveryWindowInDays: 7, // This is default.
          SecretId: secretId,
        })
        .promise()
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
  dryRun: boolean,
  transaction: Transaction
): Promise<void> => {
  const sequelize = await getSequelize()
  // Remove from database
  if (!dryRun) {
    // Set the cred_name to NULL for campaigns that previously used this orphaned credential.
    await sequelize.query(
      `UPDATE campaigns SET cred_name = NULL WHERE cred_name = :credentialName`,
      {
        replacements: { credentialName },
        type: QueryTypes.UPDATE,
        transaction,
      }
    )

    await sequelize.query(
      `DELETE FROM credentials WHERE name = :credentialName`,
      {
        replacements: { credentialName },
        type: QueryTypes.DELETE,
        transaction,
      }
    )
  }
  logger.log(`[${credentialName}] Successfully removed from credentials table.`)
}

/**
 * Remove secrets from both database and secrets manager
 */
export const removeCredentials = async (
  secretIds: string[],
  dryRun: boolean,
  transaction: Transaction
): Promise<void> => {
  // Remove from secrets manager first. If an error occurs, we add it to the failed list
  // and do not remove it from the database so that we can retry again.
  const failed: string[] = []
  for (const secretId of secretIds) {
    try {
      await deleteFromSecretManager(secretId, dryRun)
    } catch (err) {
      failed.push(secretId)
    }
  }

  // Remove secrets that have been successfully removed from database.
  const removed = difference(secretIds, failed)
  for (const secretId of removed) {
    await deleteFromDb(secretId, dryRun, transaction)
  }
}

/**
 * Get credentials in database that are not associated to a user
 */
export const getDbCredentialsWithoutUsers = async (
  transaction: Transaction
): Promise<Array<string>> => {
  const sequelize = await getSequelize()

  // Select credentials that are are:
  // 1. Not a demo/default credential
  // 2. Does not belong to an user
  // 3. Not used in an unsent campaign
  const results = await sequelize.query(
    `
    SELECT
      name
    FROM
      credentials
      LEFT OUTER JOIN user_credentials ON credentials.name = user_credentials.cred_name
    WHERE
      LOWER(credentials.name) NOT SIMILAR TO '%\\_(default|demo)'
      AND user_id IS NULL
      AND name NOT IN (
        SELECT DISTINCT
          cred_name
        FROM
          campaigns, statistics
        WHERE
          campaigns.id = statistics.campaign_id
          AND unsent > 0
          AND cred_name IS NOT NULL
      )
  `,
    { transaction }
  )

  const credentials = results[0]
    .filter((c: any): c is { name: string } => c.name !== undefined)
    .map((c) => c.name)

  return credentials
}
