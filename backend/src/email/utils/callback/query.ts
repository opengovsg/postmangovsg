import { QueryTypes } from 'sequelize'
import {
  UpdateMessageWithErrorCode,
  Metadata,
} from '@email/interfaces/callback.interface'
import { EmailBlacklist } from '@email/models'
import config from '@core/config'
import logger from '@core/logger'

/**
 * Adds email to blacklist table if it does not exist
 * @param recipientEmail
 */
export const addToBlacklist = (
  recipientEmail: string
): Promise<any> | undefined => {
  logger.info(`Updating blacklist table with ${recipientEmail}`)
  return EmailBlacklist?.sequelize?.query(
    `INSERT INTO email_blacklist (recipient, created_at, updated_at) VALUES (:recipientEmail, clock_timestamp(), clock_timestamp()) 
        ON CONFLICT DO NOTHING;`,
    {
      replacements: { recipientEmail },
      type: QueryTypes.INSERT,
    }
  )
}

/**
 * Updates email_messages with an error and error code
 *
 */
export const updateMessageWithError = async (
  opts: UpdateMessageWithErrorCode
): Promise<number | undefined> => {
  const { errorCode, timestamp, id } = opts

  logger.info(`Updating email_messages table. ${JSON.stringify(opts)}`)
  const [result] =
    (await EmailBlacklist?.sequelize?.query(
      `UPDATE email_messages SET error_code=:errorCode, received_at=:timestamp, status='INVALID_RECIPIENT', updated_at = clock_timestamp()
        WHERE id=:id 
        AND (received_at IS NULL OR received_at < :timestamp)
        RETURNING campaign_id;`,
      {
        replacements: { errorCode, timestamp, id },
        type: QueryTypes.UPDATE,
      }
    )) || []
  const campaign: { campaign_id: number } = (result || [])[0]
  return campaign?.campaign_id
}

/**
 *  Updates the email_messages table for successful delivery of an email.
 *  Delivery: Amazon SES successfully delivered the email to the recipient's mail server.
 */
export const updateMessageWithSuccess = async (
  metadata: Metadata
): Promise<number | undefined> => {
  logger.info(`Updating email_messages table. ${JSON.stringify(metadata)}`)
  // Since notifications for the same messageId can be interleaved, we only update that message if this notification is newer than the previous.
  const [result] =
    (await EmailBlacklist?.sequelize?.query(
      `UPDATE email_messages SET received_at=:timestamp, updated_at = clock_timestamp(), status='SUCCESS' 
        WHERE id=:id 
        AND (received_at IS NULL OR received_at < :timestamp)
        RETURNING campaign_id;`,
      {
        replacements: { timestamp: metadata.timestamp, id: metadata.id },
        type: QueryTypes.UPDATE,
      }
    )) || []

  const campaign: { campaign_id: number } = (result || [])[0]
  return campaign?.campaign_id
}

export const haltCampaignIfThresholdExceeded = async (
  campaignId?: number
): Promise<void> => {
  if (campaignId === undefined) {
    return
  }

  // Compute threshold for Hard bounces
  // Your bounce rate includes only hard bounces to domains you haven't verified.
  // Source: https://docs.aws.amazon.com/ses/latest/DeveloperGuide/faqs-enforcement.html#e-faq-bn
  const [result] =
    (await EmailBlacklist?.sequelize?.query(
      `SELECT SUM(CASE WHEN error_code='Hard bounce' THEN 1 ELSE 0 END) AS invalid, COUNT(1) AS running_total FROM email_messages WHERE campaign_id=:campaignId AND status IS NOT NULL`,
      {
        replacements: { campaignId },
        type: QueryTypes.SELECT,
      }
    )) || []

  const {
    invalid,
    running_total: runningTotal,
  }: { invalid?: number; running_total?: number } = result

  if (invalid !== undefined && runningTotal !== undefined) {
    const percentageInvalid = invalid / runningTotal
    const exceedsHaltNumber =
      invalid > config.get('emailCallback.minHaltNumber')
    const exceedsHaltPercentage =
      percentageInvalid > config.get('emailCallback.minHaltPercentage')
    logger.info(
      `Current campaign_id=${campaignId} invalid=${invalid} running_total=${runningTotal} 
        percentageInvalid=${percentageInvalid} 
        config.minHaltNumber=${config.get('emailCallback.minHaltNumber')}
        config.minHaltPercentage=${config.get(
          'emailCallback.minHaltPercentage'
        )}
        exceedsHaltNumber=${exceedsHaltNumber}
        exceedsHaltPercentage=${exceedsHaltPercentage}`
    )
    /* With default MIN_HALT_NUMBER=10, MIN_HALT_PERCENTAGE=0.1, 
      it means that 
      - if there were 11 messages sent thus far, and 11 invalid recipients, the campaign would halt immediately since 11/11 > MIN_HALT_PERCENTAGE
      - if there were 110 messages sent thus far, and 11 invalid recipients, the campaign would not halt, since 11/110 <= MIN_HALT_PERCENTAGE
      */
    if (exceedsHaltNumber && exceedsHaltPercentage) {
      // Halt
      logger.info(
        `Halting campaign_id=${campaignId} invalid=${invalid} running_total=${runningTotal} percentageInvalid=${percentageInvalid}`
      )

      try {
        await EmailBlacklist?.sequelize?.transaction(async (transaction) => {
          const results = await EmailBlacklist?.sequelize?.query(
            `UPDATE campaigns SET halted=TRUE where id=:campaignId 
              AND halted=FALSE;`, // If halted is null (forcefully overriden), do not halt. If halted is true, campaign has already been halted
            {
              replacements: { campaignId },
              type: QueryTypes.UPDATE,
              transaction,
            }
          )
          if (!results || results[1] !== 1)
            throw new Error(
              'Campaign has already been halted, or forcefully overridden with null to prevent halting.'
            )

          await EmailBlacklist?.sequelize?.query(
            `SELECT stop_jobs(:campaignId)`,
            {
              replacements: { campaignId },
              type: QueryTypes.SELECT,
              transaction,
            }
          )
        })
      } catch (err) {
        logger.error(`Could not halt campaign_id=${campaignId} ${err.stack}`)
      }
    }
  }
  return
}
