import {
  Includeable,
  literal,
  Op,
  Order,
  Transaction,
  WhereOptions,
} from 'sequelize'
import config from '@core/config'
import {
  CampaignSortField,
  CampaignStatus,
  ChannelType,
  JobStatus,
  Ordering,
} from '@core/constants'
import { Campaign, JobQueue, Statistic, UserDemo } from '@core/models'
import { CampaignDetails } from '@core/interfaces'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)
/**
 * Checks whether a campaign has any jobs in the job queue that are not logged, meaning that they are in progress
 * For scheduled campaigns, the identifier is that the job should be "ready" and also have a visible_at AFTER now.
 * This means that if it's before, then it's a running progress
 * @param campaignId
 */
const hasJobInProgress = (campaignId: number): Promise<JobQueue | null> => {
  return JobQueue.findOne({
    where: {
      [Op.and]: {
        campaignId,
        status: {
          [Op.not]: JobStatus.Logged,
        },
        visibleAt: {
          [Op.lte]: new Date(),
        },
      },
    },
  })
}

const hasAlreadyBeenSent = (campaignId: number): Promise<number> => {
  return JobQueue.count({
    where: {
      [Op.and]: {
        campaignId,
        status: {
          [Op.eq]: JobStatus.Logged,
        },
      },
    },
  })
}

const createDemoCampaign = async ({
  name,
  type,
  userId,
  protect,
  demoMessageLimit,
  transaction,
}: {
  name: string
  type: string
  userId: number
  protect: boolean
  demoMessageLimit: number | null
  transaction: Transaction
}): Promise<Campaign | void> => {
  const mapping: { [k: string]: string } = {
    [ChannelType.SMS]: 'numDemosSms',
    [ChannelType.Telegram]: 'numDemosTelegram',
  }
  const numDemosColumn: any = mapping[type]
  if (!numDemosColumn) {
    logger.error({
      message: `Channel type not supported for demo mode`,
      type,
    })
    return
  }
  const userDemo = await UserDemo.findOne({
    where: { userId, [numDemosColumn]: { [Op.gt]: 0 } },
    transaction,
  })
  if (userDemo) {
    const campaign = await Campaign.create(
      {
        name,
        type: type as ChannelType,
        userId,
        valid: false,
        protect,
        demoMessageLimit: demoMessageLimit as number,
      } as Campaign,
      { transaction }
    )
    await userDemo?.decrement(numDemosColumn, { transaction })
    return campaign
  } else {
    logger.error({ message: `No demos left`, userId, type })
    return
  }
}

/**
 * Helper method to create a campaign
 */
const createCampaign = async ({
  name,
  type,
  userId,
  protect,
  demoMessageLimit,
  transaction,
}: {
  name: string
  type: string
  userId: number
  protect: boolean
  demoMessageLimit: number | null
  transaction: Transaction
}): Promise<Campaign | void> => {
  const isDemo = Boolean(demoMessageLimit) // demoMessageLimit is not null, undefined, or 0
  let campaign
  if (isDemo) {
    campaign = await createDemoCampaign({
      name,
      type,
      userId,
      protect,
      demoMessageLimit,
      transaction,
    })
  } else {
    campaign = await Campaign.create(
      {
        name,
        type: type as ChannelType,
        userId,
        valid: false,
        protect,
      } as Campaign,
      { transaction }
    )
  }
  return campaign
}

const createCampaignWithTransaction = async ({
  name,
  type,
  userId,
  protect,
  demoMessageLimit,
}: {
  name: string
  type: string
  userId: number
  protect: boolean
  demoMessageLimit: number | null
}): Promise<Campaign | void> => {
  return Campaign.sequelize?.transaction(async (transaction) => {
    return await createCampaign({
      name,
      type,
      userId,
      protect,
      demoMessageLimit,
      transaction,
    })
  })
}

/**
 * List campaigns for that user
 */
const listCampaigns = ({
  userId,
  offset,
  limit,
  type,
  status,
  name,
  sortBy,
  orderBy,
}: {
  userId: number
  offset?: number
  limit?: number
  type?: ChannelType
  status?: CampaignStatus
  name?: string
  sortBy?: CampaignSortField
  orderBy?: Ordering
}): Promise<{ rows: Array<Campaign>; count: number }> => {
  const campaignJobs = '(PARTITION BY "job_queue"."campaign_id")'
  const maxAge = config.get('redaction.maxAge')
  offset = offset || 0
  limit = limit || 10

  const where = ((userId, type, name, status) => {
    const where: WhereOptions = { user_id: userId }
    if (type) where.type = type
    if (name) where.name = { [Op.iLike]: `%${name}%` }
    if (status) {
      const operation = ((status) => {
        switch (status) {
          case CampaignStatus.Draft: {
            return { [Op.is]: null }
          }
          // TODO: frontend and backend are misaligned in how they determine if a campaign has been sent (part 1/2)
          case CampaignStatus.Sending: {
            return {
              [Op.in]: [
                JobStatus.Ready,
                JobStatus.Enqueued,
                JobStatus.Sending,
                JobStatus.Sent,
                JobStatus.Stopped,
              ],
            }
          }
          case CampaignStatus.Sent: {
            return { [Op.eq]: JobStatus.Logged }
          }
          case CampaignStatus.Scheduled: {
            return {
              [Op.gte]: new Date(),
            }
          }
        }
      })(status)
      const checkField =
        status === CampaignStatus.Scheduled
          ? '$job_queue.visible_at$'
          : '$job_queue.status$'
      return {
        ...where,
        [checkField]: operation,
      }
    }
    return where
  })(userId, type, name, status)

  const order: Order = ((sortBy, orderBy) => {
    orderBy = orderBy || Ordering.DESC // default to descending
    if (!sortBy) return [[CampaignSortField.Created, orderBy]]
    switch (sortBy) {
      case CampaignSortField.Sent: {
        return [[literal('"job_queue.sent_at"'), orderBy]]
      }
      case CampaignSortField.Created: {
        return [[CampaignSortField.Created, orderBy]]
      }
    }
  })(sortBy, orderBy)

  const options: {
    where: WhereOptions
    attributes: any
    order: Order
    include: Includeable[]
    subQuery: boolean
    distinct: boolean
    offset?: number
    limit?: number
  } = ((campaignJobs, maxAge, where, order, offset, limit) => {
    return {
      where: {
        [Op.and]: where,
      },
      attributes: [
        'id',
        'name',
        'type',
        'created_at',
        'valid',
        [literal('"cred_name" IS NOT NULL'), 'has_credential'],
        'halted',
        'protect',
        [
          literal(
            // Campaigns with all messages sent and were sent more than maxAge days ago will be redacted.
            `CASE WHEN Statistic.unsent = 0 ` +
              `THEN DATE_PART('days', NOW() - MAX("job_queue"."updated_at") OVER ${campaignJobs}) > ${maxAge} ` +
              `ELSE FALSE END`
          ),
          'redacted',
        ],
        'demo_message_limit',
      ],
      order,
      // Set limit and offset at the end of the main query so that the window function will have access to the job_queue table
      subQuery: false,
      include: [
        {
          model: JobQueue,
          attributes: [
            'status',
            ['created_at', 'sent_at'],
            ['updated_at', 'status_updated_at'],
            'visible_at',
          ],
        },
        {
          model: Statistic,
          attributes: [],
        },
      ],
      distinct: true,
      offset: +offset,
      limit: +limit,
    }
  })(campaignJobs, maxAge, where, order, offset, limit)

  return Campaign.findAndCountAll(options)
}

/**
 * Get campaign details
 * @param campaignId
 * @param includes
 */
const getCampaignDetails = async (
  campaignId: number,
  includes: Includeable[]
): Promise<CampaignDetails> => {
  const campaignJobs = '(PARTITION BY "job_queue"."campaign_id")'
  const maxAge = config.get('redaction.maxAge')

  const campaignDetails = await Campaign.findOne({
    where: { id: campaignId },
    attributes: [
      'id',
      'name',
      'type',
      'created_at',
      'valid',
      'protect',
      'demo_message_limit',
      'should_bcc_to_me',
      's3_object',
      [literal('cred_name IS NOT NULL'), 'has_credential'],
      [literal("s3_object -> 'filename'"), 'csv_filename'],
      [
        literal(
          "s3_object -> 'temp_filename' IS NOT NULL AND s3_object -> 'error' IS NULL"
        ),
        'is_csv_processing',
      ],
      [
        literal(
          'Statistic.unsent + Statistic.sent + Statistic.errored + Statistic.invalid'
        ),
        'num_recipients',
      ],
      [
        literal(
          // Campaigns with all messages sent and were sent more than maxAge days ago will be redacted.
          `CASE WHEN Statistic.unsent = 0 ` +
            `THEN DATE_PART('days', NOW() - MAX("job_queue"."updated_at") OVER ${campaignJobs}) > ${maxAge} ` +
            `ELSE FALSE END`
        ),
        'redacted',
      ],
    ],
    include: [
      {
        model: JobQueue,
        attributes: ['status', 'visible_at', ['created_at', 'sent_at']],
      },
      {
        model: Statistic,
        attributes: [],
      },
      ...includes,
    ],
  })

  return campaignDetails?.get({ plain: true }) as unknown as CampaignDetails
}

/**
 * Helper method to set a campaign to invalid (when the template and uploaded csv's columns don't match)
 * @param campaignId
 */
const setInvalid = (campaignId: number): Promise<[number]> => {
  return Campaign.update(
    {
      valid: false,
    },
    {
      where: { id: +campaignId },
    }
  )
}

/**
 * Helper method to set a campaign to valid
 */
const setValid = (
  campaignId: number,
  transaction?: Transaction
): Promise<[number]> => {
  return Campaign.update(
    {
      valid: true,
    },
    {
      where: { id: +campaignId },
      transaction,
    }
  )
}

const deleteCampaign = (campaignId: number): Promise<number> => {
  return Campaign.destroy({
    where: { id: +campaignId },
  })
}
const updateCampaign = (campaign: Campaign): Promise<[number, Campaign[]]> =>
  Campaign.update(campaign, {
    where: { id: campaign.id },
    returning: true,
  })

export const CampaignService = {
  hasJobInProgress,
  hasAlreadyBeenSent,
  createCampaign,
  createCampaignWithTransaction,
  listCampaigns,
  getCampaignDetails,
  setInvalid,
  setValid,
  deleteCampaign,
  updateCampaign,
}
