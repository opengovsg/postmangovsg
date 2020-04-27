import AWS from 'aws-sdk'
import { promisify } from 'util'

const metadataService = new AWS.MetadataService()
const metadataRequest = promisify(metadataService.request)

/**
 * @see https://github.com/aws/aws-sdk-js/blob/master/lib/metadata_service.js
 * @see https://forums.aws.amazon.com/thread.jspa?threadID=251263
 */
const getInstanceId = async (): Promise<string | void> => {
  try {
    const id = await metadataRequest('/latest/meta-data/instance-id"')
    console.log(id)
    return id as string
  } catch (err) {
    console.log({ message: 'Unable to retrieve instanceId, is this running in an EC2 instance?' })
  }
}

// const getDeploymentInfo = () => {

// }

export { getInstanceId }