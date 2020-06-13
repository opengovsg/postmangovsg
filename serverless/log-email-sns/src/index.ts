import sequelizeLoader from './sequelize-loader'
import { QueryTypes } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'
let sequelize : Sequelize | null = null // Define the sequelize connection outside so that a warm lambda can reuse the connection

/**
 *  Updates the email_messages table for successful delivery of an email.
 *  Delivery: Amazon SES successfully delivered the email to the recipient's mail server.
 *  @param message JSON object that contains the notification details
 *  @param dbConnection Sequelize connection
 */
const updateSuccessfulDelivery = async (message: any, timestamp: string) => {
  const messageId = message?.mail?.commonHeaders?.messageId

  // Since notifications for the same messageId can be interleaved, we only update that message if this notification is newer than the previous. 
  await sequelize?.query(
    `UPDATE email_messages SET received_at=:timestamp, updated_at = clock_timestamp(), status='SUCCESS' 
    WHERE message_id=:messageId 
    AND (received_at IS NULL OR received_at < :timestamp);`,
    {
      replacements: { timestamp, messageId }, type: QueryTypes.UPDATE 
    })
}

/**
 *  Updates the error_code in the email_messages table for bounced delivery.
 *  Hard bounce: The recipient's mail server permanently rejected the email.
 *  Soft bounce: SES fails to deliver the email after retrying for a period of time.
 *  @param message JSON object that contains the notification details
 *  @param dbConnection Sequelize connection
 */
const updateBouncedStatus = async (message: any, timestamp: string) => {
  const bounceType = message?.bounce?.bounceType
  const messageId = message?.mail?.commonHeaders?.messageId
  const recipientEmail = message?.mail?.commonHeaders?.to[0]

  let errorCode
 
  if (bounceType === 'Permanent') {
    errorCode = "Hard bounce, the recipient's mail server permanently rejected the email."

    console.log('Updating blacklist table.')
    // Add to black list
    await sequelize?.query(
      `INSERT INTO email_blacklist (recipient, created_at, updated_at) VALUES (:recipientEmail, clock_timestamp(), clock_timestamp()) 
      ON CONFLICT DO NOTHING;`,
      {
        replacements: { recipientEmail }, type: QueryTypes.INSERT 
      })
  }
  else {
    errorCode = "Soft bounce, Amazon SES fails to deliver the email after retrying for a period of time."
  }
  
  console.log('Updating email_messages table.')
  await sequelize?.query(
    `UPDATE email_messages SET error_code=:errorCode, received_at=:timestamp, status='INVALID_RECIPIENT', updated_at = clock_timestamp()
    WHERE message_id=:messageId 
    AND (received_at IS NULL OR received_at < :timestamp);`,
    {
      replacements: { errorCode, timestamp, messageId }, type: QueryTypes.UPDATE 
    })
}

const handleMessage = async (record: any) => {
  const message = JSON.parse(record.Sns.Message)
  const notificationType = message?.notificationType

  const timestamp = record.Sns.Timestamp
  const messageId = message?.mail?.commonHeaders?.messageId
  
  if(messageId === undefined){
    console.error(`No messageId found for: ${JSON.stringify(message)}`)
    return
  }

  console.log(`Updating messageId ${messageId} in respective tables, notificationType = ${notificationType}`)
  
  switch (notificationType) {
    case "Delivery": 
      await updateSuccessfulDelivery(message, timestamp)
      break
    case "Bounce":
      await updateBouncedStatus(message, timestamp)
      break
    default:
      console.error(`Can't handle messages with this notification type. notificationType = ${notificationType}`)
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
    if(sequelize === null) {
      sequelize = await sequelizeLoader()
    }
    
    await Promise.all(event.Records.map(handleMessage))
    
    return {
      statusCode: 200,
      body: 'Ok'
    }

  } catch(err) {
    console.error(`Unhandled server error  ${err.name}: ${err.message}`)
    console.error(`Event: ${JSON.stringify(event)}`)

    return {
      statusCode: 500
    }
  }
}
