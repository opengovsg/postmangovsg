import { QueryTypes, Op, cast, fn } from 'sequelize'
import {
  UpdateMessageWithErrorMetadata,
  Metadata,
} from '@email/interfaces/callback.interface'
import { EmailBlacklist, EmailMessage } from '@email/models'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { Campaign } from '@core/models'

const logger = loggerWithLabel(module)

/**
 * Adds email to blacklist table if it does not exist
 * @param recipientEmail
 */
export const addToBlacklist = (
  recipientEmail: string
): Promise<any> | undefined => {
  logger.info({
    message: 'Updating blacklist table',
    recipientEmail,
    action: 'addToBlacklist',
  })
  return EmailBlacklist.findOrCreate({ where: { recipient: recipientEmail } })
}

/**
 * Updates email_messages with an error and error code
 *
 */
export const updateMessageWithError = async (
  opts: UpdateMessageWithErrorMetadata
): Promise<number | undefined> => {
  const { errorCode, errorSubType, timestamp, messageId } = opts

  logger.info({
    message: 'Updating email_messages table',
    opts,
    action: 'updateMessageWithError',
  })
  const [, result] = await EmailMessage.update(
    {
      errorCode: errorCode,
      errorSubType,
      receivedAt: new Date(timestamp),
      status: 'INVALID_RECIPIENT',
    } as Partial<EmailMessage>,
    {
      where: {
        [Op.and]: [
          { id: messageId },
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
  logger.info({
    message: 'Updating email_messages table',
    metadata,
    action: 'updateMessageWithSuccess',
  })
  // here id is extracted
  const { timestamp, messageId } = metadata
  // Since notifications for the same id can be interleaved, we only update that message if this notification is newer than the previous.
  // Should not overwrite a READ status for the message
  const [, result] = await EmailMessage.update(
    {
      receivedAt: new Date(timestamp),
      status: 'SUCCESS',
    } as EmailMessage,
    {
      where: {
        [Op.and]: [
          // used here
          { id: messageId },
          {
            [Op.or]: [
              { receivedAt: null },
              { receivedAt: { [Op.lt]: timestamp } },
            ],
          },
          {
            [Op.or]: [{ status: null }, { status: { [Op.ne]: 'READ' } }],
          },
        ],
      },
      returning: true,
    }
  )
  return result[0]?.campaignId
}

/**
 *  Updates the email_messages table for read receipt of an email.
 */
export const updateMessageWithRead = async (
  metadata: Metadata
): Promise<number | undefined> => {
  logger.info({
    message: 'Updating email_messages table',
    metadata,
    action: 'updateMessageWithRead',
  })
  const { timestamp, messageId } = metadata
  // Since open event supercedes error or success notification types, overwrite any previous status
  const [, result] = await EmailMessage.update(
    {
      receivedAt: new Date(timestamp),
      status: 'READ',
    } as EmailMessage,
    {
      where: { id: messageId, errorCode: null },
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
    useMaster: false,
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

    logger.info({
      message: 'Current campaign status',
      campaignId,
      invalid,
      runningTotal,
      percentageInvalid,
      minHaltNumber: config.get('emailCallback.minHaltNumber'),
      minHaltPercentage: config.get('emailCallback.minHaltPercentage'),
      exceedsHaltNumber,
      exceedsHaltPercentage,
      action: 'haltCampaignIfThresholdExceeded',
    })
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
            logger.info({
              message:
                'Campaign has already been halted, or forcefully overridden with null to prevent halting',
              campaignId,
              action: 'haltCampaignIfThresholdExceeded',
            })
            return
          } else {
            logger.info({
              message: 'Successfully halted campaign',
              campaignId,
              invalid,
              runningTotal,
              percentageInvalid,
              action: 'haltCampaignIfThresholdExceeded',
            })
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
        logger.error({
          message: 'Failed to halt campaign',
          campaignId,
          error: err,
          action: 'haltCampaignIfThresholdExceeded',
        })
      }
    }
  }
  return
}
