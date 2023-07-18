import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Config, Cron, Function, StackContext } from 'sst/constructs'

export function MyStack({ app, stack }: StackContext) {
  const postmanDbUri = new Config.Secret(stack, 'POSTMAN_DB_URI')
  const postmanApiKey = new Config.Secret(stack, 'POSTMAN_API_KEY')

  const { vpcName, lookupOptions, sgName, sgId } = getResourceIdentifiers(
    app.stage,
  )
  const existingVpc = ec2.Vpc.fromLookup(stack, vpcName, lookupOptions)
  const existingSg = ec2.SecurityGroup.fromSecurityGroupId(stack, sgName, sgId)
  app.setDefaultFunctionProps({
    vpc: existingVpc,
    securityGroups: [existingSg],
    vpcSubnets: {
      subnets: existingVpc.privateSubnets,
    },
  })
  // SST's Cron construct does not allow us to create it within a VPC
  // which is necessary in order to query the database for API key info
  // as such, we use the Cron to invoke a Function that is within the VPC
  // and does the db query and the actual sending

  // Cron job #1: send reminder email notifying users of expiring API keys
  const sendApiKeyExpiryEmailFn = new Function(stack, 'api-key-expiry', {
    handler: 'packages/functions/src/cron-jobs/api-key-expiry/main.handler',
    vpc: existingVpc,
    securityGroups: [existingSg],
    vpcSubnets: {
      subnets: existingVpc.privateSubnets,
    },
    url: {
      authorizer: 'iam',
    },
  })
  sendApiKeyExpiryEmailFn.bind([postmanApiKey, postmanDbUri])

  const sendApiKeyExpiryEmailCron = new Cron(stack, 'cron', {
    // runs every day at 12AM UTC, i.e. 8AM SGT
    schedule: 'cron(0 0 */1 * ? *)',
    job: 'packages/functions/src/cron-jobs/api-key-expiry/cron.handler',
  })
  sendApiKeyExpiryEmailCron.bind([
    new Config.Parameter(stack, 'SEND_API_KEY_EXPIRY_EMAIL_FUNCTION_URL', {
      value: sendApiKeyExpiryEmailFn.url as string, // safe because we set url in FunctionProps
    }),
    new Config.Parameter(stack, 'SEND_API_KEY_EXPIRY_EMAIL_FUNCTION_NAME', {
      value: sendApiKeyExpiryEmailFn.functionName,
    }),
    new Config.Parameter(stack, 'SEND_API_KEY_EXPIRY_EMAIL_FUNCTION_VERSION', {
      value: sendApiKeyExpiryEmailFn.currentVersion.version,
    }),
    new Config.Secret(stack, 'CRONITOR_URL_SUFFIX'),
    new Config.Secret(stack, 'CRONITOR_CODE_API_KEY_EXPIRY'),
  ])
  // required because sendReminderEmail uses iam authorizer
  sendApiKeyExpiryEmailCron.attachPermissions(['lambda:InvokeFunctionUrl'])

  // Cron job #2: send unsubscribe digest email
}

function getResourceIdentifiers(stage: string) {
  return stage === 'prod'
    ? {
        vpcName: 'postmangovsg-production-vpc',
        lookupOptions: {
          vpcId: 'vpc-0e71dfc6b3c022b7a',
          isDefault: false,
        },
        sgName: ' postmangovsg-production-serverless',
        sgId: 'sg-034854389076df5e8',
      }
    : // use staging VPC for stg and dev
      {
        vpcName: 'postmangovsg-staging-vpc',
        lookupOptions: {
          vpcId: 'vpc-006dc4e0a97146e40',
          isDefault: false,
        },
        sgName: 'postmangovsg-staging-serverless',
        sgId: 'sg-057180ddecca97846',
      }
}
