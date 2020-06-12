import sequelizeLoader from './sequelize-loader'
import { QueryTypes } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'
/**
 *  Lambda to update the email delivery status.
 *  SNS triggers it whenever it receives a new notification from SES.
 *  @param event
 */
exports.handler = async (event: any) => {
  try {
    const sequelize = await sequelizeLoader()

    const message = JSON.parse(event.Records[0].Sns.Message)

    const notificationType = message?.notificationType

    const messageId = message?.mail?.commonHeaders?.messageId

    console.log(`Updating messageId ${messageId} in respective tables, notificationType = ${notificationType}`)

    switch (notificationType) {
      case "Delivery": 
        await updateSuccessfulDelivery(message, sequelize)
        break
      case "Bounce":
        await updateBouncedStatus(message, sequelize)
        break
      default:
        throw new Error(`Can't handle messages with this notification type. notificationType = ${notificationType}`)
    }    
    
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

/**
 *  Updates the email_messages table for successful delivery of an email.
 *  Delivery: Amazon SES successfully delivered the email to the recipient's mail server.
 *  @param message JSON object that contains the notification details
 *  @param dbConnection Sequelize connection
 */
const updateSuccessfulDelivery = async (message: any, dbConnection: Sequelize ) => {
  const messageId = message?.mail?.commonHeaders?.messageId
  const timeStamp = message?.delivery?.timestamp

  await dbConnection.query(
    `UPDATE email_messages SET received_at=:timeStamp, updated_at = clock_timestamp(), status='SUCCESS' WHERE message_id=:messageId`,
    {
      replacements: { timeStamp, messageId }, type: QueryTypes.UPDATE 
    })
}

/**
 *  Updates the error_code in the email_messages table for bounced delivery.
 *  Hard bounce: The recipient's mail server permanently rejected the email.
 *  Soft bounce: SES fails to deliver the email after retrying for a period of time.
 *  @param message JSON object that contains the notification details
 *  @param dbConnection Sequelize connection
 */
const updateBouncedStatus = async (message: any, dbConnection: Sequelize) => {
  const bounceType = message?.bounce?.bounceType
  const messageId = message?.mail?.commonHeaders?.messageId
  const timeStamp = message?.delivery?.timestamp

  let errorCode
 
  if (bounceType === 'Permanent') {
    errorCode = "Hard bounce, the recipient's mail server permanently rejected the email."
  }
  else {
    errorCode = "Soft bounce, Amazon SES fails to deliver the email after retrying for a period of time."
  }
  
  await dbConnection.query(
    `UPDATE email_messages SET error_code=:errorCode, received_at=:timeStamp, status='INVALID_RECIPIENT', updated_at = clock_timestamp() WHERE message_id=:messageId`,
    {
      replacements: { errorCode, timeStamp, messageId }, type: QueryTypes.UPDATE 
    })
}