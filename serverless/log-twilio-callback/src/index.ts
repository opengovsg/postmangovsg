import querystring from 'querystring'
import bcrypt from 'bcryptjs'
import { QueryTypes } from 'sequelize'

import sequelizeLoader from './sequelize-loader'
import config from './config'

const FINALIZED_STATUS = ['sent', 'delivered', 'undelivered', 'failed']

exports.handler = async (event: any) => {
  try {
    const sequelize = await sequelizeLoader()

    const { messageId, campaignId } = event.pathParameters
    const { MessageSid: twilioMessageId, MessageStatus: twilioMessageStatus, ErrorCode: twilioErrorCode } = querystring.parse(event.body)
    console.log(JSON.stringify(event))
    // Do not process message if it's not of a finalized delivery status
    if (FINALIZED_STATUS.indexOf(twilioMessageStatus as string) === -1) {
      return {
        statusCode: 200,
        body: 'No update of message delivery status'
      }
    }

    // Authenticate request from twilio
    // lambda authorizer ensures that Authorizer header is present
    const authHeader = event.headers.Authorization
    const credentials = Buffer.from(authHeader.split(" ")[1], 'base64').toString()
    const [username, password] = credentials.split(':')
    const plainTextPassword = username + messageId + campaignId + config.get('callbackSecret')

    const isValid = bcrypt.compareSync(plainTextPassword, password)

    if (!isValid) {
      console.log(`Unable to validate Twilio request for message id ${twilioMessageId}`)
      return {
        statusCode: 403
      }
    }

    console.log(`Updating messageId ${messageId} in sms_messages`)
    if (twilioErrorCode) {
      await sequelize.query(`UPDATE sms_messages SET errorCode=:twilioErrorCode, updated_at = clock_timestamp() WHERE id=:messageId AND campaign_id=:campaignId`, 
        {
          replacements: { twilioErrorCode, messageId, campaignId }, type: QueryTypes.UPDATE,
        })
    } else {
      await sequelize.query(`UPDATE sms_messages SET received_at = clock_timestamp(), updated_at = clock_timestamp() WHERE id=:messageId AND campaign_id=:campaignId`,  
      { 
        replacements: { messageId, campaignId }, type: QueryTypes.UPDATE 
      })
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