import { QueryTypes, Op, cast, fn } from 'sequelize'
import {
  UpdateMessageWithErrorCode,
  Metadata,
} from '@email/interfaces/callback.interface'
import { EmailBlacklist, EmailMessage } from '@email/models'
import config from '@core/config'
import logger from '@core/logger'
import { Campaign } from '@core/models'

/**
 * Adds email to blacklist table if it does not exist
 * @param recipientEmail
 */
export const addToBlacklist = (
  recipientEmail: string
): Promise<any> | undefined => {
  logger.info(`Updating blacklist table with ${recipientEmail}`)
  return EmailBlacklist.findOrCreate({ where: { recipient: recipientEmail } })
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
  const [, result] = await EmailMessage.update(
    {
      errorCode: errorCode,
      receivedAt: timestamp,
      status: 'INVALID_RECIPIENT',
    },
    {
      where: {
        [Op.and]: [
          { id },
          {
            [Op.or]: [
              { receivedAt: null },
              { receivedAt: { [Op.lt]: timestamp } },
            ],
          },
        ],
      },
      returning: true,
    }
  )
  return result[0]?.campaignId
}

/**
 *  Updates the email_messages table for successful delivery of an email.
 *  Delivery: Amazon SES successfully delivered the email to the recipient's mail server.
 */
export const updateMessageWithSuccess = async (
  metadata: Metadata
): Promise<number | undefined> => {
  logger.info(`Updating email_messages table. ${JSON.stringify(metadata)}`)
  const { timestamp, id } = metadata
  // Since notifications for the same messageId can be interleaved, we only update that message if this notification is newer than the previous.
  const [, result] = await EmailMessage.update(
    {
      receivedAt: timestamp,
      status: 'SUCCESS',
    },
    {
      where: {
        [Op.and]: [
          { id },
          {
            [Op.or]: [
              { receivedAt: null },
              { receivedAt: { [Op.lt]: timestamp } },
            ],
          },
        ],
      },
      returning: true,
    }
  )
  return result[0]?.campaignId
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
  const [result] = (await EmailMessage.findAll({
    raw: true,
    where: { campaignId, status: { [Op.ne]: null } },
    attributes: [
      [fn('sum', cast({ error_code: 'Hard bounce' }, 'int')), 'invalid'],
      [fn('count', 1), 'running_total'],
    ],
  })) as any[]
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
      try {
        await EmailBlacklist?.sequelize?.transaction(async (transaction) => {
          const [numUpdated] = await Campaign.update(
            { halted: true },
            { where: { id: campaignId, halted: false }, transaction }
          )
          if (numUpdated !== 1) {
            logger.info(
              'Campaign has already been halted, or forcefully overridden with null to prevent halting.'
            )
            return
          } else {
            logger.info(
              `Successfully halted campaign_id=${campaignId} invalid=${invalid} running_total=${runningTotal} percentageInvalid=${percentageInvalid}`
            )
          }

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
