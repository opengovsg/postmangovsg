import { Request } from 'express'
import { Op } from 'sequelize'
import bcrypt from 'bcrypt'
import config from '@core/config'
import {
  SmsMessage,
  SmsMessageTransactional,
  TransactionalSmsMessageStatus,
} from '@sms/models'
import { loggerWithLabel } from '@core/logger'
import { compareSha256Hash } from '@shared/utils/crypto'

const logger = loggerWithLabel(module)

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
  const plainTextPassword = username + messageId + campaignId
  let isAuthenticated = compareSha256Hash(
    config.get('smsCallback.callbackSecret'),
    plainTextPassword,
    password
  )
  // if not passed with the new hash, retry with the old way
  // TODO: remove this after all campaigns sent with the old way have completed
  if (!isAuthenticated) {
    logger.info({
      message: 'Incorrect sms callback hash',
      hash: password,
      messageId,
      campaignId,
      username,
    })
    const bcryptPlainTextPassword =
      username +
      messageId +
      campaignId +
      config.get('smsCallback.callbackSecret')
    isAuthenticated = bcrypt.compareSync(bcryptPlainTextPassword, password)
  }
  return isAuthenticated
}

const isAuthenticatedTransactional = (authHeader?: string): boolean => {
  const headerKey = 'Basic'
  if (!authHeader) return false

  const [header, secret] = authHeader.trim().split(' ')
  if (headerKey !== header) return false

  const credentials = Buffer.from(secret, 'base64').toString('utf8')
  const [username, password] = credentials.split(':')
  return compareSha256Hash(
    config.get('smsCallback.callbackSecret'),
    username,
    password
  )
}

const parseEvent = async (req: Request): Promise<void> => {
  const { messageId, campaignId } = req.params
  const { MessageStatus: twilioMessageStatus, ErrorCode: twilioErrorCode } =
    req.body
  // Do not process message if it's not of a finalized delivery status
  if (FINALIZED_STATUS.indexOf(twilioMessageStatus as string) === -1) {
    return
  }
  logger.info({
    message: 'Updating message in sms_messages',
    messageId,
    campaignId,
    action: 'parseEvent',
  })
  if (twilioErrorCode) {
    await SmsMessage.update(
      {
        errorCode: twilioErrorCode,
        status: 'ERROR',
      } as SmsMessage,
      {
        where: {
          id: messageId,
          campaignId,
        },
      }
    )
  } else {
    // longer messages are delivered in multiple segments
    // each segment has a separate delivery status
    // Update the message as successful only if there does not exist previous failed status
    await SmsMessage.update(
      {
        receivedAt: new Date(),
        status: 'SUCCESS',
      } as SmsMessage,
      {
        where: {
          id: messageId,
          campaignId,
          errorCode: { [Op.eq]: null },
        },
      }
    )
  }
}

// for future context: we only care about when the twilio callback is a finalized status
// we don't want to update the status pre-emptively until we receive the finalized status
// initial state --> UNSENT
const parseTransactionalEvent = async (req: Request): Promise<void> => {
  const {
    MessageStatus: twilioMessageStatus,
    ErrorCode: twilioErrorCode,
    MessageSid: messageId,
  } = req.body

  // this part is not type-safe and any changes here should be treated with caution
  // refer to twilio message status docs if you need more context
  if (FINALIZED_STATUS.indexOf(twilioMessageStatus as string) === -1) {
    return
  }
  logger.info({
    message: 'Updating message in sms_messages_transactional',
    messageId,
    action: 'parseTransactionalEvent',
  })

  if (twilioErrorCode) {
    await SmsMessageTransactional.update(
      {
        errorCode: twilioErrorCode,
        status: TransactionalSmsMessageStatus.Error,
      } as SmsMessageTransactional,
      {
        where: {
          messageId,
        },
      }
    )
  } else {
    // longer messages are delivered in multiple segments
    // each segment has a separate delivery status
    // Update the message as successful only if there does not exist previous failed status
    // update only if sent or delivered
    // map here because twilio does not explicitly send "error"
    const mappedStatus = mapTwilioMessageStatus(twilioMessageStatus)
    if (
      mappedStatus === TransactionalSmsMessageStatus.Sent ||
      mappedStatus === TransactionalSmsMessageStatus.Delivered
    ) {
      await SmsMessageTransactional.update(
        {
          updatedAt: new Date(),
          status: mappedStatus,
        } as SmsMessageTransactional,
        {
          where: {
            messageId,
            errorCode: { [Op.eq]: null },
          },
        }
      )
    }
  }
}

const mapTwilioMessageStatus = (
  status: string
): TransactionalSmsMessageStatus => {
  switch (status) {
    case 'sent':
      return TransactionalSmsMessageStatus.Sent
    case 'delivered':
      return TransactionalSmsMessageStatus.Delivered
    case 'accepted':
      return TransactionalSmsMessageStatus.Accepted
    default:
      return TransactionalSmsMessageStatus.Unsent
  }
}
export const SmsCallbackService = {
  isAuthenticated,
  isAuthenticatedTransactional,
  parseEvent,
  parseTransactionalEvent,
}
