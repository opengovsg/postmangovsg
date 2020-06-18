import { QueryTypes } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'
import sequelizeLoader from './sequelize-loader'
import { UpdateMessageWithErrorCode, Metadata } from './interfaces'

let sequelize: Sequelize | null = null // Define the sequelize connection outside so that a warm lambda can reuse the connection

export const init = async () => {
  if (sequelize === null) {
    sequelize = await sequelizeLoader()
  }
}

/**
 * Adds email to blacklist table if it does not exist
 * @param recipientEmail
 */
export const addToBlacklist = (recipientEmail: string) => {
  console.log(`Updating blacklist table with ${recipientEmail}`)
  return sequelize?.query(
    `INSERT INTO email_blacklist (recipient, created_at, updated_at) VALUES (:recipientEmail, clock_timestamp(), clock_timestamp()) 
      ON CONFLICT DO NOTHING;`,
    {
      replacements: { recipientEmail },
      type: QueryTypes.INSERT,
    }
  )
}

/**
 * Updates email_messages with an error and error code
 *
 */
export const updateMessageWithError = (opts: UpdateMessageWithErrorCode) => {
  const { errorCode, timestamp, id } = opts

  console.log(`Updating email_messages table. ${JSON.stringify(opts)}`)
  return sequelize?.query(
    `UPDATE email_messages SET error_code=:errorCode, received_at=:timestamp, status='INVALID_RECIPIENT', updated_at = clock_timestamp()
      WHERE id=:id 
      AND (received_at IS NULL OR received_at < :timestamp);`,
    {
      replacements: { errorCode, timestamp, id },
      type: QueryTypes.UPDATE,
    }
  )
}

/**
 *  Updates the email_messages table for successful delivery of an email.
 *  Delivery: Amazon SES successfully delivered the email to the recipient's mail server.
 */
export const updateMessageWithSuccess = async (metadata: Metadata) => {
  console.log(`Updating email_messages table. ${JSON.stringify(metadata)}`)
  // Since notifications for the same messageId can be interleaved, we only update that message if this notification is newer than the previous.
  await sequelize?.query(
    `UPDATE email_messages SET received_at=:timestamp, updated_at = clock_timestamp(), status='SUCCESS' 
      WHERE id=:id 
      AND (received_at IS NULL OR received_at < :timestamp);`,
    {
      replacements: { timestamp: metadata.timestamp, id: metadata.id },
      type: QueryTypes.UPDATE,
    }
  )
}
