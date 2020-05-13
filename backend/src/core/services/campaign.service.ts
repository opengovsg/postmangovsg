import { Op, literal  } from 'sequelize'
import config from '@core/config'
import { JobStatus } from '@core/constants'
import { Campaign, JobQueue } from '@core/models'

const FILE_STORAGE_BUCKET_NAME = config.aws.uploadBucket

const hasJobInProgress =  (campaignId: number): Promise<JobQueue | null> => {
  return JobQueue.findOne({ where: { campaignId, status: { [Op.not]: JobStatus.Logged } } })
}

const createCampaign = ({ name, type, userId }: {name: string; type: string; userId: number}):  Promise<Campaign> => {
  return Campaign.create({ name, type, userId, valid: false })
}

const updateCampaignS3Metadata = ({ key, campaignId, filename }: { key: string; campaignId: string; filename: string }): Promise<[number, Campaign[]]> => {
  const s3Object = {
    key,
    bucket: FILE_STORAGE_BUCKET_NAME,
    filename,
  }

  return Campaign
    .update(
      { s3Object },
      {
        where: {
          id: campaignId,
        },
        returning: true,
      }
    )
}

const retrieveCampaign = (id: number): Promise<Campaign> => {
  return Campaign.findByPk(id)
}

const listCampaigns = ({ userId, offset, limit }: {userId: number; offset: number; limit: number}): Promise<Array<Campaign>> => {
  const options: { where: any; attributes: any; order: any; include: any; offset?: number; limit?: number } = {
    where: {
      userId,
    },
    attributes: [
      'id', 'name', 'type', 'created_at', 'valid', [literal('CASE WHEN "cred_name" IS NULL THEN False ELSE True END'), 'has_credential'],
    ],
    order: [
      ['created_at', 'DESC'],
    ],
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

const setInvalid = (campaignId: number): Promise<[number, Campaign[]]> => {
  return Campaign.update({
    valid: false,
  }, {
    where: { id: +campaignId },
  })
}


export const CampaignService = { 
  hasJobInProgress, 
  createCampaign, 
  retrieveCampaign, 
  listCampaigns, 
  updateCampaignS3Metadata, 
  setInvalid, 
}
