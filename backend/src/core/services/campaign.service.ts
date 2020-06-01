import { Op, literal, Transaction } from 'sequelize'
import config from '@core/config'
import { JobStatus } from '@core/constants'
import { Campaign, JobQueue } from '@core/models'

const FILE_STORAGE_BUCKET_NAME = config.get('aws.uploadBucket')

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
}: {
  name: string
  type: string
  userId: number
}): Promise<Campaign> => {
  return Campaign.create({ name, type, userId, valid: false })
}

/**
 * On file upload, save the transaction id and file name against the campaign so that we can download the file from s3 later
 * @param param0
 */
const updateCampaignS3Metadata = (
  key: string,
  campaignId: string,
  filename: string,
  transaction: Transaction | undefined
): Promise<[number, Campaign[]]> => {
  const s3Object = {
    key,
    bucket: FILE_STORAGE_BUCKET_NAME,
    filename,
  }

  return Campaign.update(
    { s3Object },
    {
      where: {
        id: campaignId,
      },
      returning: true,
      transaction,
    }
  )
}

/**
 * Helper method to find a campaign by id
 * @param id
 */
const retrieveCampaign = (id: number): Promise<Campaign> => {
  return Campaign.findByPk(id)
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
}): Promise<Array<Campaign>> => {
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
      [
        literal('CASE WHEN "cred_name" IS NULL THEN False ELSE True END'),
        'has_credential',
      ],
    ],
    order: [['created_at', 'DESC']],
    include: [
      {
        model: JobQueue,
        attributes: ['status', ['created_at', 'sent_at']],
      },
    ],
  }
  if (offset) {
    options.offset = +offset
  }
  if (limit) {
    options.limit = +limit
  }

  return Campaign.findAll(options)
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
  retrieveCampaign,
  listCampaigns,
  updateCampaignS3Metadata,
  setInvalid,
  setValid,
}
