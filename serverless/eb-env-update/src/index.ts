import AWS from 'aws-sdk'
import * as Sentry from '@sentry/node'
import config from './config'
Sentry.init({
  dsn: config.get('sentryDsn'),
  environment: config.get('env'),
})
Sentry.configureScope((scope) => {
  const functionName =
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    `eb-env-update-${config.get('env')}`
  scope.setTag('lambda-function-name', functionName)
})

const eb = new AWS.ElasticBeanstalk()

const matchSecretId = (request: string, secretId: string) =>{
  // arn:aws:secretsmanager:<REGION>:<ACCOUNT_ID>:secret:<SECRET_NAME>-<RANDOM_CHARS>
  const indexOfSecretId = request.indexOf(secretId)
  if(indexOfSecretId === -1) return false
  const indexOfRandomChars = request.lastIndexOf('-')
  return secretId === request.substring(indexOfSecretId, indexOfRandomChars > -1 ? indexOfRandomChars : undefined)
}

exports.handler = async (event : any) => {
  try{
    const { detail } = event
    if (
      detail &&
      detail.eventSource === 'secretsmanager.amazonaws.com' &&
      detail.eventName === 'PutSecretValue'
    ) {
      const { requestParameters } = detail
      if (
        requestParameters &&
        matchSecretId(requestParameters.secretId, config.get('secretId'))
      ) {
        const environmentName = config.get('secretId').substring(config.get('prefix').length)
        const callbackEnvironmentName = `${environmentName}-callback`
        console.log(`Updating config for environmentName ${environmentName}`)
        await eb
          .restartAppServer({
            EnvironmentName: environmentName
          })
          .promise()
        console.log(`Updating config for environmentName ${callbackEnvironmentName}`)
        await eb
          .restartAppServer({
            EnvironmentName: callbackEnvironmentName
          })
          .promise()
      }
    }
    return
  } catch (err) {
    console.error(err)

    Sentry.captureException(err)
    await Sentry.flush(2000)

    throw err
  }
}
