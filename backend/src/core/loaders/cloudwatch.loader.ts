import WinstonCloudwatch from 'winston-cloudwatch'
import { hostname } from 'os'

import config from '@core/config'
import { createCustomLogger } from '@core/utils/logger'
import { getInstanceId } from '@core/utils/ec2'
import { configureEndpoint } from '@core/utils/aws-endpoint'

const logger = createCustomLogger(module)

/**
 * Writes logs directly to cloudwatch instead of relying on Elastic beanstalk's Cloudwatch agent
 */
const cloudwatchLoader = async (): Promise<void> => {
  const instanceId = config.get('aws.awsEndpoint')
    ? hostname()
    : await getInstanceId()
  try {
    if (instanceId) {
      logger.info({
        message: `Detected instanceId as ${instanceId}`,
        instanceId,
      })
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
    logger.error({
      message: 'Unable to add winston cloudwatch transport',
      error: err,
      instanceId,
    })
  }
}

export default cloudwatchLoader
