import { Campaign } from '@core/models'
import config from '@core/config'
import { jwtUtils } from '@core/utils/jwt'
import logger from '@core/logger'

const FILE_STORAGE_BUCKET_NAME = config.aws.uploadBucket

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

// decodes JWT
const extractS3Key = (transactionId: string): string => {
  let decoded: string
  try {
    decoded = jwtUtils.verify(transactionId) as string
  } catch (err) {
    logger.error(`${err.stack}`)
    throw new Error('Invalid transactionId provided')
  }
  return decoded as string
}


export { extractS3Key, retrieveCampaign, updateCampaignS3Metadata }
