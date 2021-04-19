import { LogEvent, SmsDeliveryEvent } from './interface'
import { getSequelize } from './sequelize-loader'
import { Logger } from './utils/logger'

const logger = new Logger('process-event')

const updateMessage = async (
  status: 'SUCCESS' | 'ERROR',
  messageId: string,
  error?: string
): Promise<void> => {
  const sequelize = await getSequelize()

  const currentTime = new Date()
  const result = await sequelize.query(
    `UPDATE sms_messages
     SET status=:status, error_code=:errorCode, received_at=:recievedAt, updated_at=:updatedAt
     WHERE message_id=:messageId AND status='SENDING'`,
    {
      replacements: {
        status,
        errorCode: error ?? null,
        recievedAt: currentTime,
        updatedAt: currentTime,
        messageId,
      },
    }
  )
  const { rowCount } = result[1] as { rowCount: number }
  if (rowCount === 0) {
    throw new Error(
      `Unable to find matching sms message with messageId: ${messageId}`
    )
  }
}

export const processEvent = async (event: LogEvent): Promise<void> => {
  try {
    const smsEvent: SmsDeliveryEvent = JSON.parse(event.message)
    const {
      status,
      delivery,
      notification: { messageId },
    } = smsEvent

    if (status === 'SUCCESS') {
      await updateMessage(status, messageId)
    } else {
      const error = delivery.providerResponse.toString()
      await updateMessage('ERROR', messageId, error)
    }
    logger.log(`Succesfully updated sms message with messageId: ${messageId}`)
  } catch (err) {
    logger.log(err.message)
  }
}
