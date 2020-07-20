import { QueryTypes } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'
import sequelizeLoader from './sequelize-loader'
import { UpdateMessageWithErrorCode, Metadata } from './interfaces'
import config from './config'

let sequelize: Sequelize | null = null // Define the sequelize connection outside so that a warm lambda can reuse the connection

export const init = async () => {
  if (sequelize === null) {
    sequelize = await sequelizeLoader()
  }
}

/**
 * Adds email to blacklist table if it does not exist
 * @param recipientEmail
 */
export const addToBlacklist = (recipientEmail: string) => {
  console.log(`Updating blacklist table with ${recipientEmail}`)
  return sequelize?.query(
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

  console.log(`Updating email_messages table. ${JSON.stringify(opts)}`)
  const [result] =
    (await sequelize?.query(
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
  console.log(`Updating email_messages table. ${JSON.stringify(metadata)}`)
  // Since notifications for the same messageId can be interleaved, we only update that message if this notification is newer than the previous.
  const [result] =
    (await sequelize?.query(
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

export const haltCampaignIfThresholdExceeded = async (campaignId?: number) => {
  if (campaignId === undefined) {
    return
  }

  // Compute threshold for Hard bounces
  // Your bounce rate includes only hard bounces to domains you haven't verified. 
  // Source: https://docs.aws.amazon.com/ses/latest/DeveloperGuide/faqs-enforcement.html#e-faq-bn
  const [result] =
    (await sequelize?.query(
      `SELECT SUM(CASE WHEN error_code='Hard bounce' THEN 1 ELSE 0 END) AS invalid, COUNT(1) AS running_total FROM email_messages WHERE campaign_id=:campaignId AND status IS NOT NULL`,
      {
        replacements: { campaignId },
        type: QueryTypes.SELECT,
      }
    )) || []

  const {
    invalid,
    running_total,
  }: { invalid?: number; running_total?: number } = result

  if (invalid !== undefined && running_total !== undefined) {
    const percentageInvalid = invalid / running_total
    const exceedsHaltNumber = invalid > config.get('minHaltNumber')
    const exceedsHaltPercentage =
      percentageInvalid > config.get('minHaltPercentage')
    console.log(
      `Current campaign_id=${campaignId} invalid=${invalid} running_total=${running_total} 
      percentageInvalid=${percentageInvalid} 
      config.minHaltNumber=${config.get('minHaltNumber')}
      config.minHaltPercentage=${config.get('minHaltPercentage')}
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
      console.log(
        `Halting campaign_id=${campaignId} invalid=${invalid} running_total=${running_total} percentageInvalid=${percentageInvalid}`
      )

      try {
        await sequelize?.transaction(async (transaction) => {
          const results = await sequelize?.query(
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

          await sequelize?.query(`SELECT stop_jobs(:campaignId)`, {
            replacements: { campaignId },
            type: QueryTypes.SELECT,
            transaction,
          })
        })
      } catch (err) {
        console.error(`Could not halt campaign_id=${campaignId} ${err.stack}`)
      }
    }
  }
  return
}
