import { Campaign } from '@core/models'
import config from '@core/config'

const FILE_STORAGE_BUCKET_NAME = config.aws.uploadBucket

const updateProjectS3Metadata = ({key, projectId} : {key: string, projectId: string}): Promise<[number, Campaign[]]> => {
  const s3Object = {
    key,
    bucket: FILE_STORAGE_BUCKET_NAME
  }

  return Campaign
    .update(
      { s3Object },
      {
        where: {
          id: projectId
        },
        returning: true
      }
    )
}

export { updateProjectS3Metadata }
