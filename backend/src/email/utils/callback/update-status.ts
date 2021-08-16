import {
  updateMessageWithError,
  updateMessageWithSuccess,
  updateMessageWithRead,
  haltCampaignIfThresholdExceeded,
} from './query'
import {
  BounceMetadata,
  ComplaintMetadata,
  Metadata,
} from '@email/interfaces/callback.interface'

export const updateDeliveredStatus = async (
  metadata: Metadata
): Promise<void> => {
  await updateMessageWithSuccess(metadata)
}
/**
 *  Updates the error_code in the email_messages table for bounced delivery.
 *  Hard bounce: The recipient's mail server permanently rejected the email.
 *  Soft bounce: SES fails to deliver the email after retrying for a period of time.
 *  @param message JSON object that contains the notification details
 *  @param timestamp ISO string from notification timestamp
 */
export const updateBouncedStatus = async (
  metadata: BounceMetadata
): Promise<void> => {
  const bounceType = metadata.bounceType
  const errorSubType = metadata.bounceSubType
  let errorCode

  if (bounceType === 'Permanent') {
    errorCode = 'Hard bounce'
  } else {
    errorCode = 'Soft bounce'
  }

  const campaignId = await updateMessageWithError({
    errorCode,
    errorSubType,
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
export const updateComplaintStatus = async (
  metadata: ComplaintMetadata
): Promise<void> => {
  const errorCode = metadata.complaintType
  const errorSubType = metadata.complaintSubType

  if (errorCode) {
    const campaignId = await updateMessageWithError({
      errorCode,
      errorSubType,
      timestamp: metadata.timestamp,
      id: metadata.id,
    })
    await haltCampaignIfThresholdExceeded(campaignId)
  }
}

export const updateReadStatus = async (metadata: Metadata): Promise<void> => {
  await updateMessageWithRead(metadata)
}
