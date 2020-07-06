import {
  init,
  addToBlacklist,
  updateMessageWithError,
  updateMessageWithSuccess,
  haltCampaignIfThresholdExceeded,
} from './query'
import { BounceMetadata, ComplaintMetadata } from './interfaces'

const REFERENCE_ID_HEADER = 'X-Postman-ID' // Case sensitive

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
 *  Updates the error_code in the email_messages table for bounced delivery.
 *  Hard bounce: The recipient's mail server permanently rejected the email.
 *  Soft bounce: SES fails to deliver the email after retrying for a period of time.
 *  @param message JSON object that contains the notification details
 *  @param timestamp ISO string from notification timestamp
 */
const updateBouncedStatus = async (metadata: BounceMetadata) => {
  const bounceType = metadata.bounceType
  const recipients = metadata.to
  let errorCode

  if (bounceType === 'Permanent') {
    errorCode = 'Hard bounce'
    // Add to black list
    if (recipients) await Promise.all(recipients.map(addToBlacklist))
  } else {
    errorCode = 'Soft bounce'
  }

  const campaignId = await updateMessageWithError({
    errorCode,
    timestamp: metadata.timestamp,
    id: metadata.id,
  })
  await haltCampaignIfThresholdExceeded(campaignId)
}

/**
 * Updates the error_code in the email_messages table for complaints.
 *  @param message JSON object that contains the notification details
 *  @param timestamp ISO string from notification timestamp
 */
const updateComplaintStatus = async (metadata: ComplaintMetadata) => {
  const errorCode = metadata.complaintType
  const recipients = metadata.to

  if (errorCode && recipients) {
    await Promise.all(recipients.map(addToBlacklist))
    const campaignId = await updateMessageWithError({
      errorCode,
      timestamp: metadata.timestamp,
      id: metadata.id,
    })
    await haltCampaignIfThresholdExceeded(campaignId)
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
      await updateMessageWithSuccess(metadata)
      break
    case 'Bounce':
      await updateBouncedStatus({
        ...metadata,
        bounceType: message?.bounce?.bounceType,
        to: message?.mail?.commonHeaders?.to,
      })
      break
    case 'Complaint':
      await updateComplaintStatus({
        ...metadata,
        complaintType: message?.complaint?.complaintFeedbackType,
        to: message?.mail?.commonHeaders?.to,
      })
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
    await init()
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
