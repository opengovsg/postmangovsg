import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Api, Config, Cron, Function, StackContext } from 'sst/constructs'

export function MyStack({ app, stack }: StackContext) {
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

  const sendReminderEmail = new Function(stack, 'api-key-expiry', {
    handler: 'packages/functions/src/api-key-expiry/main.handler',
    vpc: existingVpc,
    securityGroups: [existingSg],
    vpcSubnets: {
      subnets: existingVpc.privateSubnets,
    },
    url: true,
  })
  sendReminderEmail.bind([
    new Config.Secret(stack, 'POSTMAN_DB_URI'),
    new Config.Secret(stack, 'POSTMAN_API_KEY'),
  ])

  // probably can refactor this?
  new Api(stack, 'Api', {
    routes: {
      'GET    /api-key-expiry': {
        function: sendReminderEmail,
        // add authorization
      },
    },
  })
  const cron = new Cron(stack, 'cron', {
    // runs every day at 12AM UTC, i.e. 8AM SGT
    schedule: 'cron(0 0 */1 * ? *)',
    job: 'packages/functions/src/api-key-expiry/cron.handler',
  })
  // sendReminderEmail.grantInvoke(cron)
  cron.bind([
    new Config.Parameter(stack, 'FUNCTION_URL', {
      value: sendReminderEmail.url as string,
    }),
    new Config.Parameter(stack, 'FUNCTION_NAME', {
      value: sendReminderEmail.functionName,
    }),
    new Config.Parameter(stack, 'FUNCTION_VERSION', {
      value: sendReminderEmail.currentVersion.version,
    }),
  ])
  cron.attachPermissions('*')
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
