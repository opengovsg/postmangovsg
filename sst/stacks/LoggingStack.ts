import { ArnFormat, Duration } from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as route53resolver from 'aws-cdk-lib/aws-route53resolver'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { StackContext } from 'sst/constructs'

import { getResourceIdentifiers } from './MyStack'

const FLOW_LOGS_PREFIX = 'vpc-flow-logs'

export function LoggingStack({ app, stack }: StackContext) {
  const { vpcName, lookupOptions } = getResourceIdentifiers(app.stage)
  const vpc = ec2.Vpc.fromLookup(stack, vpcName, lookupOptions)

  const bucket = new s3.Bucket(stack, 'security-logs', {
    bucketName: `postmangovsg-securitylogs-${app.stage}`,
    encryption: s3.BucketEncryption.S3_MANAGED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    enforceSSL: true,
    // Retention follows the OGP cloud logging baselines in Notion
    lifecycleRules: [
      { prefix: `${FLOW_LOGS_PREFIX}/`, expiration: Duration.days(30) },
    ],
  })

  bucket.addToResourcePolicy(
    new iam.PolicyStatement({
      principals: [new iam.ServicePrincipal('delivery.logs.amazonaws.com')],
      actions: ['s3:PutObject'],
      resources: [
        bucket.arnForObjects(`${FLOW_LOGS_PREFIX}/AWSLogs/${stack.account}/*`),
      ],
      conditions: {
        StringEquals: {
          's3:x-amz-acl': 'bucket-owner-full-control',
          'aws:SourceAccount': stack.account,
        },
      },
    }),
  )
  bucket.addToResourcePolicy(
    new iam.PolicyStatement({
      principals: [new iam.ServicePrincipal('delivery.logs.amazonaws.com')],
      actions: ['s3:GetBucketAcl', 's3:ListBucket'],
      resources: [bucket.bucketArn],
      conditions: { StringEquals: { 'aws:SourceAccount': stack.account } },
    }),
  )

  new ec2.FlowLog(stack, 'vpc-flow-log', {
    resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
    destination: ec2.FlowLogDestination.toS3(bucket, FLOW_LOGS_PREFIX),
    trafficType: ec2.FlowLogTrafficType.ALL,
  })

  if (app.stage === 'prod') {
    // Route 53 Resolver adds the log group's write policy itself, provided
    // the deploy role can call logs:PutResourcePolicy
    const resolverLogs = new logs.LogGroup(stack, 'resolver-logs', {
      logGroupName: `postmangovsg-${app.stage}/route53/resolver-logs`,
      retention: logs.RetentionDays.ONE_MONTH,
    })
    // Resolver takes the bare log group ARN. logGroupArn ends in ":*".
    const resolverLogsArn = stack.formatArn({
      service: 'logs',
      resource: 'log-group',
      resourceName: resolverLogs.logGroupName,
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
    })
    const queryLogConfig = new route53resolver.CfnResolverQueryLoggingConfig(
      stack,
      'resolver-query-logs',
      {
        name: `postmangovsg-${app.stage}-resolver-query-logs`,
        destinationArn: resolverLogsArn,
      },
    )
    new route53resolver.CfnResolverQueryLoggingConfigAssociation(
      stack,
      'resolver-query-logs-association',
      {
        resolverQueryLogConfigId: queryLogConfig.attrId,
        resourceId: vpc.vpcId,
      },
    )
  }

  stack.addOutputs({ SecurityLogsBucket: bucket.bucketName })
}
