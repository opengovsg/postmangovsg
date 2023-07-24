import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Config, Cron, StackContext } from 'sst/constructs'

export function MyStack({ app, stack }: StackContext) {
  const postmanDbUri = new Config.Secret(stack, 'POSTMAN_DB_URI')
  const postmanApiKey = new Config.Secret(stack, 'POSTMAN_API_KEY')
  const cronitorUrlSuffix = new Config.Secret(stack, 'CRONITOR_URL_SUFFIX')

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
  // Cron job #1: send reminder email notifying users of expiring API keys
  const apiKeyExpiryCron = new Cron(stack, 'api-key-expiry-cron', {
    // runs every day at 12AM UTC, i.e. 8AM SGT
    schedule: 'cron(0 0 * * ? *)',
    job: {
      function: {
        handler: 'packages/functions/src/cron-jobs/api-key-expiry/cron.handler',
        securityGroups: [existingSg],
        vpc: existingVpc,
        vpcSubnets: {
          subnets: existingVpc.privateSubnets,
        },
        timeout: '10 minutes',
      },
    },
  })
  const apiKeyExpiryCronResources = [
    postmanApiKey,
    postmanDbUri,
    cronitorUrlSuffix,
  ]
  if (!app.local) {
    apiKeyExpiryCronResources.push(
      new Config.Secret(stack, 'CRONITOR_CODE_API_KEY_EXPIRY'),
    )
  }
  apiKeyExpiryCron.bind(apiKeyExpiryCronResources)

  // Cron job #2: send redaction digest email
  const redactionDigestCron = new Cron(stack, 'redaction-digest-cron', {
    // runs every Monday at 1AM UTC, i.e. 9AM SGT
    schedule: 'cron(0 1 ? * 2 *)',
    job: {
      function: {
        handler:
          'packages/functions/src/cron-jobs/redaction-digest/cron.handler',
        timeout: '10 minutes',
        vpc: existingVpc,
        securityGroups: [existingSg],
        vpcSubnets: {
          subnets: existingVpc.privateSubnets,
        },
      },
    },
  })
  const redactionDigestCronResources = [
    postmanApiKey,
    postmanDbUri,
    cronitorUrlSuffix,
  ]
  if (!app.local) {
    redactionDigestCronResources.push(
      new Config.Secret(stack, 'CRONITOR_CODE_REDACTION_DIGEST'),
    )
  }
  redactionDigestCron.bind(redactionDigestCronResources)

  // Cron job #3: send unsubscribe digest email
  const unsubDigestCron = new Cron(stack, 'unsub-digest-cron', {
    // runs every Monday at 1:30AM UTC, i.e. 9:30AM SGT
    schedule: 'cron(30 1 ? * 2 *)',
    job: {
      function: {
        handler: 'packages/functions/src/cron-jobs/unsub-digest/cron.handler',
        timeout: '10 minutes',
        vpc: existingVpc,
        securityGroups: [existingSg],
        vpcSubnets: {
          subnets: existingVpc.privateSubnets,
        },
      },
    },
  })
  const unsubDigestCronResources = [
    postmanApiKey,
    postmanDbUri,
    cronitorUrlSuffix,
  ]
  if (!app.local) {
    unsubDigestCronResources.push(
      new Config.Secret(stack, 'CRONITOR_CODE_UNSUB_DIGEST'),
    )
  }
  unsubDigestCron.bind(unsubDigestCronResources)
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
