/* eslint-disable no-console */
import { loggerWithLabel } from '@core/logger'
import axios, { AxiosResponse } from 'axios'

const logger = loggerWithLabel(module)

/**
 * Gets metadata for ec2 instance
 * @see https://github.com/axios/axios/issues/647#issuecomment-322209906
 */
const queryAwsMetadata = (): Promise<AxiosResponse> => {
  const CancelToken = axios.CancelToken
  const source = CancelToken.source()

  setTimeout(() => {
    source.cancel('Getting AWS metadata timed out')
  }, 1000)

  return axios.get('http://169.254.169.254/latest/meta-data/instance-id', {
    cancelToken: source.token,
  })
}

/**
 * Gets instance id from the ec2 metadata (in this case, used for cloudwatch logging)
 * @see https://github.com/aws/aws-sdk-js/blob/master/lib/metadata_service.js
 * @see https://forums.aws.amazon.com/thread.jspa?threadID=251263
 */
const getInstanceId = async (): Promise<string | void> => {
  try {
    const resp = await queryAwsMetadata()
    return resp.data
  } catch (err) {
    logger.error({
      message:
        'Unable to retrieve instanceId, is this running in an EC2 instance?',
      error: err,
      action: 'getInstanceId',
    })
  }
}

export { getInstanceId }
