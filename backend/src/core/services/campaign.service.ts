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
 * On file upload complete, save the transaction id and file name against the campaign so that we can download the file from s3 later
 */
const replaceCampaignS3Metadata = (
  campaignId: number,
  key: string,
  filename: string,
  transaction: Transaction | undefined
): Promise<[number, Campaign[]]> => {
  return Campaign.update(
    {
      s3Object: {
        key,
        filename,
        bucket: FILE_STORAGE_BUCKET_NAME,
      },
    },
    {
      where: {
        id: campaignId,
      },
      returning: true,
      transaction,
    }
  )
}

/*
 * On file upload processing start, store temp filename in s3 object
 */
const storeS3TempFilename = async (
  campaignId: number,
  tempFilename: string
): Promise<void> => {
  return Campaign.updateS3ObjectKey(campaignId, 'tempFilename', tempFilename)
}

/*
 * On file upload processing failed, store error string in s3 object
 */
const storeS3Error = async (
  campaignId: number,
  error: string
): Promise<void> => {
  return Campaign.updateS3ObjectKey(campaignId, 'error', error)
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
  listCampaigns,
  replaceCampaignS3Metadata,
  storeS3TempFilename,
  storeS3Error,
  setInvalid,
  setValid,
}
