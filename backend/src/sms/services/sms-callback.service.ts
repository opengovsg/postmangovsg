import { Request } from 'express'
import bcrypt from 'bcrypt'
import config from '@core/config'
import logger from '@core/logger'
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
  logger.info(`Updating messageId ${messageId} in sms_messages`)
  if (twilioErrorCode) {
    await SmsMessage.update(
      {
        errorCode: twilioErrorCode,
        status: 'ERROR',
      },
      {
        where: {
          id: messageId,
          campaignId,
        },
      }
    )
  } else {
    await SmsMessage.update(
      {
        receivedAt: new Date(),
        status: 'SUCCESS',
      },
      {
        where: {
          id: messageId,
          campaignId,
        },
      }
    )
  }
}
export const SmsCallbackService = {
  isAuthenticated,
  parseEvent,
}
