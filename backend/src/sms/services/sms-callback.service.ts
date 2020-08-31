import { Request } from 'express'
import bcrypt from 'bcrypt'
import { QueryTypes } from 'sequelize'
import config from '@core/config'
import { SmsMessage } from '@sms/models'
const FINALIZED_STATUS = ['sent', 'delivered', 'undelivered', 'failed']

const isAuthenticated = (
  messageId: string,
  campaignId: string,
  authHeader?: string
): boolean => {
  const headerKey = 'Basic'
  if (!authHeader) return false

  const [header, secret] = authHeader.trim().split(' ')
  if (headerKey !== header) return false

  const credentials = Buffer.from(secret, 'base64').toString('utf8')
  const [username, password] = credentials.split(':')
  const plainTextPassword =
    username + messageId + campaignId + config.get('smsCallback.callbackSecret')
  return bcrypt.compareSync(plainTextPassword, password)
}
const parseEvent = async (req: Request): Promise<void> => {
  const { messageId, campaignId } = req.params
  const {
    MessageStatus: twilioMessageStatus,
    ErrorCode: twilioErrorCode,
  } = req.body
  // Do not process message if it's not of a finalized delivery status
  if (FINALIZED_STATUS.indexOf(twilioMessageStatus as string) === -1) {
    return
  }
  console.log(`Updating messageId ${messageId} in sms_messages`)
  if (twilioErrorCode) {
    await SmsMessage?.sequelize?.query(
      `UPDATE sms_messages SET error_code=:twilioErrorCode, updated_at = clock_timestamp(), status = 'ERROR' WHERE id=:messageId AND campaign_id=:campaignId`,
      {
        replacements: { twilioErrorCode, messageId, campaignId },
        type: QueryTypes.UPDATE,
      }
    )
  } else {
    await SmsMessage?.sequelize?.query(
      `UPDATE sms_messages SET received_at = clock_timestamp(), updated_at = clock_timestamp(), status = 'SUCCESS' WHERE id=:messageId AND campaign_id=:campaignId`,
      {
        replacements: { messageId, campaignId },
        type: QueryTypes.UPDATE,
      }
    )
  }
}
export const SmsCallbackService = {
  isAuthenticated,
  parseEvent,
}
