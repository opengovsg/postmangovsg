import axios from 'axios'

/**
 * @see https://github.com/axios/axios/issues/647#issuecomment-322209906
 */
const queryAwsMetadata  = () => {
  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();

  setTimeout(() => {
    source.cancel('Getting AWS metadata timed out')
  }, 3000)

  return axios.get('http://169.254.169.254/latest/meta-data/instance-id', {cancelToken: source.token})
}

/**
 * @see https://github.com/aws/aws-sdk-js/blob/master/lib/metadata_service.js
 * @see https://forums.aws.amazon.com/thread.jspa?threadID=251263
 */
const getInstanceId = async (): Promise<string | void> => {
  try {
    const resp = await queryAwsMetadata()
    return resp.data
  } catch (err) {
    console.log(err)
    console.log('Unable to retrieve instanceId, is this running in an EC2 instance?')
  }
}

export { getInstanceId }