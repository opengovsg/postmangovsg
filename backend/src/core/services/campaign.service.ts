import { Op, literal, Transaction, Includeable } from 'sequelize'
import { ChannelType, JobStatus } from '@core/constants'
import { Campaign, JobQueue, Statistic, UserTrial } from '@core/models'
import { CampaignDetails } from '@core/interfaces'

/**
 * Checks whether a campaign has any jobs in the job queue that are not logged, meaning that they are in progress
 * @param campaignId
 */
const hasJobInProgress = (campaignId: number): Promise<JobQueue | null> => {
  return JobQueue.findOne({
    where: { campaignId, status: { [Op.not]: JobStatus.Logged } },
  })
}

/**
 * Helper method to create a campaign
 */
const createCampaign = ({
  name,
  type,
  userId,
  protect,
  trial,
}: {
  name: string
  type: string
  userId: number
  protect: boolean
  trial: boolean
}): Promise<Campaign> | undefined => {
  const result = Campaign.sequelize?.transaction(async (transaction) => {
    let campaign
    if (trial) {
      let numTrialsColumn: any = ''
      switch (type) {
        case ChannelType.SMS:
          numTrialsColumn = 'num_trials_sms'
          break
        default:
          throw new Error(`Channel type not supported for trial mode ${type}`)
      }

      const userTrial = await UserTrial.findOne({
        where: { userId, [numTrialsColumn]: { $gt: 0 } },
        transaction,
      })
      if (userTrial)
        campaign = await Campaign.create(
          {
            name,
            type,
            userId,
            valid: false,
            protect,
            trial,
          },
          { transaction }
        )
      await userTrial?.decrement(numTrialsColumn, { transaction })
    } else {
      {
        campaign = await Campaign.create(
          {
            name,
            type,
            userId,
            valid: false,
            protect,
          },
          { transaction }
        )
      }
    }
    return campaign
  })
  return result
}

/**
 * List campaigns for that user
 */
const listCampaigns = ({
  userId,
  offset,
  limit,
}: {
  userId: number
  offset: number
  limit: number
}): Promise<{ rows: Array<Campaign>; count: number }> => {
  const options: {
    where: any
    attributes: any
    order: any
    include: any
    offset?: number
    limit?: number
  } = {
    where: {
      userId,
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
    ],
    order: [['created_at', 'DESC']],
    include: [
      {
        model: JobQueue,
        attributes: [
          'status',
          ['created_at', 'sent_at'],
          ['updated_at', 'status_updated_at'],
        ],
      },
    ],
  }
  if (offset) {
    options.offset = +offset
  }
  if (limit) {
    options.limit = +limit
  }

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
  const campaignDetails = await Campaign.findOne({
    where: { id: campaignId },
    attributes: [
      'id',
      'name',
      'type',
      'created_at',
      'valid',
      'protect',
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
    ],
    include: [
      {
        model: JobQueue,
        attributes: ['status', ['created_at', 'sent_at']],
      },
      {
        model: Statistic,
        attributes: [],
      },
      ...includes,
    ],
  })

  return campaignDetails?.get({ plain: true }) as CampaignDetails
}

/**
 * Helper method to set a campaign to invalid (when the template and uploaded csv's columns don't match)
 * @param campaignId
 */
const setInvalid = (campaignId: number): Promise<[number, Campaign[]]> => {
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
 * @param campaignId
 */
const setValid = (
  campaignId: number,
  transaction?: Transaction
): Promise<[number, Campaign[]]> => {
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

export const CampaignService = {
  hasJobInProgress,
  createCampaign,
  listCampaigns,
  getCampaignDetails,
  setInvalid,
  setValid,
}
