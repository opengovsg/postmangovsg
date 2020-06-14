import sequelizeLoader from './sequelize-loader'
import { QueryTypes } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'
import {
  UpdateMessageWithErrorCode,
  Metadata,
  BounceMetadata,
  ComplaintMetadata,
} from './interfaces'
const REFERENCE_ID_HEADER = 'X-Postman-ID' // Case sensitive
let sequelize: Sequelize | null = null // Define the sequelize connection outside so that a warm lambda can reuse the connection

/**
 * Parses the message to find the matching email_message id
 * @param message
 */
const getReferenceId = (message: any): string | undefined => {
  const headers: Array<{ name: string; value: string }> = message?.mail?.headers
  const referenceId = headers.find(({ name }) => name === REFERENCE_ID_HEADER)
    ?.value
  return referenceId
}

/**
 * Adds email to blacklist table if it does not exist
 * @param recipientEmail
 */
const addToBlacklist = (recipientEmail: string) => {
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
const updateMessageWithError = (opts: UpdateMessageWithErrorCode) => {
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
 *  @param message JSON object that contains the notification details
 *  @param timestamp ISO string from notification timestamp
 */
const updateSuccessfulDelivery = async (metadata: Metadata) => {
  console.log(`Updating email_messages table ${JSON.stringify(metadata)}`)
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

/**
 *  Updates the error_code in the email_messages table for bounced delivery.
 *  Hard bounce: The recipient's mail server permanently rejected the email.
 *  Soft bounce: SES fails to deliver the email after retrying for a period of time.
 *  @param message JSON object that contains the notification details
 *  @param timestamp ISO string from notification timestamp
 */
const updateBouncedStatus = async (metadata: BounceMetadata) => {
  const bounceType = metadata.message?.bounce?.bounceType
  const recipients = metadata?.message?.mail?.commonHeaders?.to
  let errorCode

  if (bounceType === 'Permanent') {
    errorCode =
      "Hard bounce, the recipient's mail server permanently rejected the email."
    // Add to black list
    if (recipients) await Promise.all(recipients.map(addToBlacklist))
  } else {
    errorCode =
      'Soft bounce, Amazon SES fails to deliver the email after retrying for a period of time.'
  }

  await updateMessageWithError({
    errorCode,
    timestamp: metadata.timestamp,
    id: metadata.id,
  })
}

/**
 * Updates the error_code in the email_messages table for bounced delivery.
 *  @param message JSON object that contains the notification details
 *  @param timestamp ISO string from notification timestamp
 */
const updateComplaintStatus = async (metadata: ComplaintMetadata) => {
  const errorCode = metadata.message?.complaint?.complaintFeedbackType
  const recipients = metadata?.message?.mail?.commonHeaders?.to

  if (errorCode && recipients) {
    await Promise.all(recipients.map(addToBlacklist))
    await updateMessageWithError({
      errorCode,
      timestamp: metadata.timestamp,
      id: metadata.id,
    })
  }
}

const handleMessage = async (record: any) => {
  const message = JSON.parse(record.Sns.Message)
  const id = getReferenceId(message)
  const messageId = message?.mail?.commonHeaders?.messageId
  if (id === undefined) {
    console.log(
      `No ${REFERENCE_ID_HEADER} header found for messageId ${messageId}.`
    )
    return
  }

  const notificationType = message?.notificationType
  const timestamp = record.Sns.Timestamp

  console.log(`Update for notificationType = ${notificationType}`)
  const metadata = { id, timestamp, messageId }
  switch (notificationType) {
    case 'Delivery':
      await updateSuccessfulDelivery(metadata)
      break
    case 'Bounce':
      await updateBouncedStatus({...metadata, message})
      break
    case 'Complaint':
      await updateComplaintStatus({...metadata, message})
      break
    default:
      console.error(
        `Can't handle messages with this notification type. notificationType = ${notificationType}`
      )
      return
  }
}

/**
 *  Lambda to update the email delivery status.
 *  SNS triggers it whenever it receives a new notification from SES.
 *  @param event
 */
exports.handler = async (event: any) => {
  try {
    if (sequelize === null) {
      sequelize = await sequelizeLoader()
    }
    
    await Promise.all(event.Records.map(handleMessage))

    return {
      statusCode: 200,
      body: 'Ok',
    }
  } catch (err) {
    console.error(`Unhandled server error  ${err.name}: ${err.message}`)
    console.error(`Event: ${JSON.stringify(event)}`)

    return {
      statusCode: 500,
    }
  }
}
