import querystring from 'querystring'
import bcrypt from 'bcrypt'
import { QueryTypes } from 'sequelize'

import sequelize from './sequelize-loader'
import config from './config'

const finalizedStatuses = ['sent', 'delivered', 'undelivered', 'failed']

const requiredEnvVars = [
  'BACKEND_URL',
  'TWILIO_CALLBACK_SECRET'
]

const checkRequiredEnvVars = (vars: Array<string>): boolean => {
  vars.forEach(v => {
    if (!process.env[v]) {
      console.log(`${v} environment variable is not set!`)
      throw new Error(`${v} environment variable is not set!`)
    }
  })
  return true
}

exports.handler = async (event: any) => {
  try {
    checkRequiredEnvVars(requiredEnvVars)

    const { messageId, campaignId } = event.pathParameters
    const { MessageSid: twilioMessageId, MessageStatus: twilioMessageStatus, ErrorCode: twilioErrorCode } = querystring.parse(event.body)


    // Do not process message if it's not of a finalized delivery status
    if (finalizedStatuses.indexOf(twilioMessageStatus as string) === -1) {
      return
    }

    // Authenticate request from twilio
    // lambda authorizer ensures that Authorizer header is present
    const authHeader = event.headers.Authorization
    const credentials = new Buffer(authHeader.split(" ")[1], 'base64').toString()
    const [username, password] = credentials.split(':')
    const plainTextPassword = username + messageId + campaignId + config.smsOptions.callbackSecret

    const isValid = await bcrypt.compare(plainTextPassword, password)

    if (!isValid) {
      console.log(`Unable to validate Twilio request for message id ${twilioMessageId}`)
      return
    }

    if (twilioErrorCode) {
      await sequelize.query(`UPDATE sms_messages SET errorCode = ${twilioErrorCode} WHERE id = ${messageId} AND campaign_id = ${campaignId}`, { type: QueryTypes.UPDATE })
    } else {
      await sequelize.query(`UPDATE sms_messages SET received_at = clock_timestamp() WHERE id = ${messageId} AND campaign_id = ${campaignId}`, { type: QueryTypes.UPDATE })
    }

    return {
      statusCode: 200,
      body: 'Ok'
    }

  } catch(err) {
    console.error(`Unhandled server error  ${err.name}: ${err.message}`)

    return {
      statusCode: 500
    }
  }
}