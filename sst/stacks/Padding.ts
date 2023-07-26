import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { Config, Function, StackContext } from 'sst/constructs'

export function Padding({ stack }: StackContext) {
  const awsSesFrom = StringParameter.valueFromLookup(
    stack,
    '/sst/postmangovsg-sst/AWS_SES_FROM',
  )
  const awsSesPort = StringParameter.valueFromLookup(
    stack,
    '/sst/postmangovsg-sst/AWS_SES_PORT',
  )

  const usEast1Padding = new Function(stack, 'us-east-1-padding', {
    handler: 'packages/functions/src/padding/us-east-1.handler',
    environment: {
      AWS_SES_FROM: awsSesFrom,
      AWS_SES_PORT: awsSesPort,
    },
  })
  usEast1Padding.bind([
    new Config.Secret(stack, 'AWS_SES_HOST_US_EAST_1'),
    new Config.Secret(stack, 'AWS_SES_USER_US_EAST_1'),
    new Config.Secret(stack, 'AWS_SES_PASS_US_EAST_1'),
  ])
  // const apSoutheast1Padding = new Function(stack, 'ap-southeast-1-padding', {
  //   handler: 'packages/functions/src/padding/ap-southeast-1.handler',
  // })
  // apSoutheast1Padding.bind([
  //   awsSesFrom,
  //   awsSesPort,
  //   new Config.Secret(stack, 'AWS_SES_HOST_AP_SOUTHEAST_1'),
  //   new Config.Secret(stack, 'AWS_SES_USER_AP_SOUTHEAST_1'),
  //   new Config.Secret(stack, 'AWS_SES_PASS_AP_SOUTHEAST_1'),
  // ])
  // const apSoutheast2Padding = new Function(stack, 'ap-southeast-2-padding', {
  //   handler: 'packages/functions/src/padding/ap-southeast-2.handler',
  // })
  // apSoutheast2Padding.bind([
  //   awsSesFrom,
  //   awsSesPort,
  //   new Config.Secret(stack, 'AWS_SES_HOST_AP_SOUTHEAST_2'),
  //   new Config.Secret(stack, 'AWS_SES_USER_AP_SOUTHEAST_2'),
  //   new Config.Secret(stack, 'AWS_SES_PASS_AP_SOUTHEAST_2'),
  // ])
}
