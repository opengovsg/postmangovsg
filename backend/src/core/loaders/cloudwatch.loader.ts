import WinstonCloudwatch from 'winston-cloudwatch'

import config from '@core/config'
import logger from '@core/logger'
import { getInstanceId } from '@core/utils/ec2'

const cloudwatchLoader = async (): Promise<void> => {
  const instanceId = await getInstanceId()
  if (instanceId) {
    logger.transports.push(new WinstonCloudwatch({
      logGroupName: 'postmangovsg-beanstalk-testing',
      logStreamName: instanceId,
      awsRegion: config.aws.awsRegion,
    }))
  }
}

export default cloudwatchLoader