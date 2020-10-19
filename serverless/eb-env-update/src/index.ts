import AWS from 'aws-sdk'
import config from './config'
const eb = new AWS.ElasticBeanstalk()
exports.handler = async (event : any, context: any) => {
  const { detail } = event
  if (
    detail &&
    detail.eventSource === 'secretsmanager.amazonaws.com' &&
    detail.eventName === 'PutSecretValue'
  ) {
    const { requestParameters } = detail
    if (
      requestParameters &&
      requestParameters.secretId === config.get('secretId')
    ) {
      const environmentName = config.get('secretId').substring(config.get('prefix').length)
      console.log(`Updating config for environmentName ${environmentName}`)
      await eb
        .updateEnvironment({
          EnvironmentName: environmentName,
          OptionSettings: [
            {
              Namespace: 'aws:elasticbeanstalk:application:environment',
              OptionName: 'awsRequestId',
              Value: context.awsRequestId,
            },
          ],
        })
        .promise()
    }
  }
  return
}
