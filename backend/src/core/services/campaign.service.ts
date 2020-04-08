import { Campaign } from '@core/models'
import config from '@core/config'

const FILE_STORAGE_BUCKET_NAME = config.aws.uploadBucket

const updateCampaignS3Metadata = ({key, campaignId} : {key: string, campaignId: string}): Promise<[number, Campaign[]]> => {
  const s3Object = {
    key,
    bucket: FILE_STORAGE_BUCKET_NAME
  }

  return Campaign
    .update(
      { s3Object },
      {
        where: {
          id: campaignId
        },
        returning: true
      }
    )
}

export { updateCampaignS3Metadata }
