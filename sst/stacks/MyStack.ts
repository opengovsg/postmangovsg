import { Config, Cron, Stack, StackContext } from 'sst/constructs'

export function MyStack({ stack }: StackContext) {
  const apiKeyExpiryCron = new Cron(stack, 'cron', {
    // runs every day at 12AM UTC, i.e. 8AM SGT
    schedule: 'cron(0 0 */1 * ? *)',
    job: 'packages/functions/src/api-key-expiry/cron.handler',
  })
  apiKeyExpiryCron.attachPermissions(getPermissions())
  apiKeyExpiryCron.bind(getSecrets(stack))
}

function getSecrets(stack: Stack) {
  return [
    new Config.Secret(stack, 'POSTMAN_DB_URI'),
    new Config.Secret(stack, 'POSTMAN_API_KEY'),
  ]
}

function getPermissions() {
  return [
    // necessary to change VPC of Lambda to VPC of RDS
    'ec2:DescribeNetworkInterfaces',
    'ec2:CreateNetworkInterface',
    'ec2:DeleteNetworkInterface',
    'ec2:DescribeInstances',
    'ec2:AttachNetworkInterface',
  ]
}
