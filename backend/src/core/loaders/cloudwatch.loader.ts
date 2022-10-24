import config from '@core/config'
import { addTransport, loggerWithLabel } from '@core/logger'
import { configureEndpoint } from '@core/utils/aws-endpoint'
import { getInstanceId } from '@core/utils/ec2'
import { hostname } from 'os'
import WinstonCloudwatch from 'winston-cloudwatch'

const logger = loggerWithLabel(module)

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
      addTransport(
        new WinstonCloudwatch({
          name: config.get('aws.logGroupName'),
          logGroupName: config.get('aws.logGroupName'),
          logStreamName: instanceId,
          awsOptions: configureEndpoint(config),
          jsonMessage: true,
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
