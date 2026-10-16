import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

const ALB_LOGS_PREFIX = 'AWSLogs'
const FLOW_LOGS_PREFIX = 'vpc-flow-logs'

const retained: pulumi.CustomResourceOptions = { retainOnDelete: true }

export function createSecurityLogging(args: {
  stack: string
  accountId: string
  accountCheck: pulumi.Output<string>
  vpcId: pulumi.Input<string>
}) {
  const { stack, accountId, accountCheck, vpcId } = args
  const bucketName = `postmangovsg-securitylogs-${stack}`

  const bucket = new aws.s3.Bucket(
    'security-logs',
    { bucket: accountCheck.apply(() => bucketName) },
    retained,
  )

  new aws.s3.BucketPublicAccessBlock('security-logs', {
    bucket: bucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  })

  const encryption = new aws.s3.BucketServerSideEncryptionConfiguration(
    'security-logs',
    {
      bucket: bucket.id,
      rules: [
        {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: 'AES256',
          },
        },
      ],
    },
  )

  // ALB and flow-log delivery send the bucket-owner-full-control ACL.
  // A new bucket otherwise defaults to BucketOwnerEnforced, which disables
  // ACLs, and the flow-log policy condition below would never match.
  const ownership = new aws.s3.BucketOwnershipControls('security-logs', {
    bucket: bucket.id,
    rule: { objectOwnership: 'ObjectWriter' },
  })

  new aws.s3.BucketLifecycleConfiguration('security-logs', {
    bucket: bucket.id,
    rules: [
      {
        id: 'expire-alb-logs',
        status: 'Enabled',
        filter: { prefix: `${ALB_LOGS_PREFIX}/` },
        expiration: { days: 7 },
      },
      {
        id: 'expire-flow-logs',
        status: 'Enabled',
        filter: { prefix: `${FLOW_LOGS_PREFIX}/` },
        expiration: { days: 30 },
      },
    ],
  })

  const flowLog = new aws.ec2.FlowLog(
    'vpc-flow-log',
    {
      vpcId,
      trafficType: 'ALL',
      logDestinationType: 's3',
      logDestination: pulumi.interpolate`${bucket.arn}/${FLOW_LOGS_PREFIX}`,
      maxAggregationInterval: 600,
    },
    { dependsOn: [encryption, ownership] },
  )

  const policy = aws.iam.getPolicyDocumentOutput({
    statements: [
      {
        sid: 'DenyInsecureTransport',
        effect: 'Deny',
        principals: [{ type: '*', identifiers: ['*'] }],
        actions: ['s3:*'],
        resources: [bucket.arn, pulumi.interpolate`${bucket.arn}/*`],
        conditions: [
          {
            test: 'Bool',
            variable: 'aws:SecureTransport',
            values: ['false'],
          },
        ],
      },
      {
        sid: 'ElbAccessLogs',
        effect: 'Allow',
        principals: [
          {
            type: 'Service',
            identifiers: ['logdelivery.elasticloadbalancing.amazonaws.com'],
          },
        ],
        actions: ['s3:PutObject'],
        resources: [
          pulumi.interpolate`${bucket.arn}/${ALB_LOGS_PREFIX}/${accountId}/*`,
        ],
      },
      {
        sid: 'FlowLogsWrite',
        effect: 'Allow',
        principals: [
          { type: 'Service', identifiers: ['delivery.logs.amazonaws.com'] },
        ],
        actions: ['s3:PutObject'],
        resources: [
          pulumi.interpolate`${bucket.arn}/${FLOW_LOGS_PREFIX}/AWSLogs/${accountId}/*`,
        ],
        conditions: [
          {
            test: 'StringEquals',
            variable: 's3:x-amz-acl',
            values: ['bucket-owner-full-control'],
          },
          {
            test: 'StringEquals',
            variable: 'aws:SourceAccount',
            values: [accountId],
          },
        ],
      },
      {
        sid: 'FlowLogsAclCheck',
        effect: 'Allow',
        principals: [
          { type: 'Service', identifiers: ['delivery.logs.amazonaws.com'] },
        ],
        actions: ['s3:GetBucketAcl', 's3:ListBucket'],
        resources: [bucket.arn],
        conditions: [
          {
            test: 'StringEquals',
            variable: 'aws:SourceAccount',
            values: [accountId],
          },
        ],
      },
    ],
  })

  // CreateFlowLogs overwrites the bucket policy when the caller owns the
  // bucket. Apply ours after the flow log so the ELB statement survives.
  new aws.s3.BucketPolicy(
    'security-logs',
    {
      bucket: bucket.id,
      policy: policy.json,
    },
    { dependsOn: [flowLog] },
  )

  // Staging already has a working resolver query log config. AWS allows one
  // destination of each type per VPC, so this is prod only.
  if (stack === 'prod') {
    const resolverLogs = new aws.cloudwatch.LogGroup(
      'resolver-logs',
      {
        name: `postmangovsg-${stack}/route53/resolver-logs`,
        retentionInDays: 30,
      },
      retained,
    )
    const queryLogConfig = new aws.route53.ResolverQueryLogConfig(
      'resolver-query-logs',
      {
        name: `postmangovsg-${stack}-resolver-query-logs`,
        // The provider strips the ":*" suffix. Resolver rejects that suffix.
        destinationArn: resolverLogs.arn,
      },
    )
    new aws.route53.ResolverQueryLogConfigAssociation(
      'resolver-query-logs-association',
      {
        resolverQueryLogConfigId: queryLogConfig.id,
        resourceId: vpcId,
      },
    )
  }

  return { bucketName: bucket.bucket }
}
