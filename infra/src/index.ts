import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

import { createSecurityLogging } from './logging'

const stack = pulumi.getStack()
if (stack !== 'stg' && stack !== 'prod') {
  throw new Error(
    `This project only deploys the stg and prod stacks. Got "${stack}".`,
  )
}

const config = new pulumi.Config()
const accountId = config.require('accountId')
const vpcId = config.require('vpcId')

// Fail the preview when the credentials are for a different account than
// the stack config. The bucket name is derived from this check so resources
// are not registered against the wrong account.
const accountCheck = aws.getCallerIdentityOutput().accountId.apply((actual) => {
  if (actual !== accountId) {
    throw new Error(
      `Refusing to run in AWS account ${actual}. Stack ${stack} expects ${accountId}.`,
    )
  }
  return actual
})

const vpc = aws.ec2.getVpcOutput({ id: vpcId })

const logging = createSecurityLogging({
  stack,
  accountId,
  accountCheck,
  vpcId: vpc.id,
})

export const securityLogsBucket = logging.bucketName
