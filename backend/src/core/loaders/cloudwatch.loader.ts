import WinstonCloudwatch from 'winston-cloudwatch'

import config from '@core/config'
import logger from '@core/logger'
import { getInstanceId } from '@core/utils/ec2'
import { configureEndpoint } from '@core/utils/aws-endpoint'

/**
 * Writes logs directly to cloudwatch instead of relying on Elastic beanstalk's Cloudwatch agent
 */
const cloudwatchLoader = async (): Promise<void> => {
  const instanceId = await getInstanceId()
  try {
    if (instanceId) {
      logger.info({ message: `Detected instanceId as ${instanceId}` })
      logger.add(
        new WinstonCloudwatch({
          logGroupName: config.get('aws.logGroupName'),
          logStreamName: instanceId,
          awsOptions: configureEndpoint(config),
        })
      )
    }
  } catch (err) {
    console.error(err)
    console.error('Unable to add winston cloudwatch transport')
  }
}

export default cloudwatchLoader
