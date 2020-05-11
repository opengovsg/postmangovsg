import WinstonCloudwatch from 'winston-cloudwatch'

import config from '@core/config'
import logger from '@core/logger'
import { getInstanceId } from '@core/utils/ec2'

const cloudwatchLoader = async (): Promise<void> => {
  const instanceId = await getInstanceId()
  try {
    if (instanceId) {
      logger.info({ message: `Detected instanceId as ${instanceId}` })
      logger.add(new WinstonCloudwatch({
        logGroupName: config.aws.logGroupName,
        logStreamName: instanceId,
        awsRegion: config.aws.awsRegion,
      }))
    }
  } catch (err) {
    console.error(err)
    console.error('Unable to add winston cloudwatch transport')
  }
}

export default cloudwatchLoader