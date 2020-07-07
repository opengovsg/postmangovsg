import {
  addToBlacklist,
  updateMessageWithError,
  updateMessageWithSuccess,
  haltCampaignIfThresholdExceeded,
} from '../query'
import { BounceMetadata, ComplaintMetadata, Metadata } from '../interfaces'

export const updateDeliveredStatus = async (metadata: Metadata) => {
  await updateMessageWithSuccess(metadata)
}
/**
 *  Updates the error_code in the email_messages table for bounced delivery.
 *  Hard bounce: The recipient's mail server permanently rejected the email.
 *  Soft bounce: SES fails to deliver the email after retrying for a period of time.
 *  @param message JSON object that contains the notification details
 *  @param timestamp ISO string from notification timestamp
 */
export const updateBouncedStatus = async (metadata: BounceMetadata) => {
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
export const updateComplaintStatus = async (metadata: ComplaintMetadata) => {
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
