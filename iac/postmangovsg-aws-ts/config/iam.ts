import * as aws from '@pulumi/aws'
export const ebServiceTrustPolicy : aws.iam.PolicyDocument = {
	'Version': '2012-10-17',
	'Statement': [
		{
			'Effect': 'Allow',
			'Principal': {
				'Service': 'elasticbeanstalk.amazonaws.com',
			},
			'Action': 'sts:AssumeRole',
			'Condition': {
				'StringEquals': {
					'sts:ExternalId': 'elasticbeanstalk',
				},
			},
		}
	],
}

export const ebInstanceTrustPolicy : aws.iam.PolicyDocument = {
	'Version': '2008-10-17',
	'Statement': [
		{
			'Effect': 'Allow',
			'Principal': {
				'Service': 'ec2.amazonaws.com',
			},
			'Action': 'sts:AssumeRole',
		}
	],
}

export const ecsTrustPolicy : aws.iam.PolicyDocument = {
	'Version': '2008-10-17',
	'Statement': [
		{
			'Sid': '',
			'Effect': 'Allow',
			'Principal': {
				'Service': 'ecs-tasks.amazonaws.com',
			},
			'Action': 'sts:AssumeRole',
		}
	],
}

export const lambdaTrustPolicy : aws.iam.PolicyDocument = {
	"Version": "2012-10-17",
	"Statement": [
	  {
		"Effect": "Allow",
		"Principal": {
		  "Service": "lambda.amazonaws.com"
		},
		"Action": "sts:AssumeRole"
	  }
	]
  }

export const S3BucketManagementPolicyDocument : aws.iam.PolicyDocument = {
	'Version': '2012-10-17',
	'Statement': [
		{
			'Sid': 'ManageUploadBucket',
			'Effect': 'Allow',
			'Action': [
				's3:PutObject',
				's3:GetObjectAcl',
				's3:GetObject',
				's3:ListBucketMultipartUploads',
				's3:GetObjectVersionTagging',
				's3:GetObjectVersionAcl',
				's3:ListBucket',
				's3:GetObjectVersionForReplication',
				's3:DeleteObject',
				's3:GetObjectVersion',
				's3:ListMultipartUploadParts'
			],
			'Resource': '*',
		}
	],
}

export const SecretsManagerRWPolicyDocument : aws.iam.PolicyDocument = {
	'Version': '2012-10-17',
	'Statement': [
		{
			'Sid': 'ManageSecretTokens',
			'Effect': 'Allow',
			'Action': [
				'secretsmanager:DescribeSecret',
				'secretsmanager:PutSecretValue',
				'secretsmanager:CreateSecret',
				'secretsmanager:CancelRotateSecret',
				'secretsmanager:ListSecretVersionIds',
				'secretsmanager:UpdateSecret',
				'secretsmanager:GetRandomPassword',
				'secretsmanager:GetResourcePolicy',
				'secretsmanager:GetSecretValue',
				'secretsmanager:RestoreSecret',
				'secretsmanager:RotateSecret',
				'secretsmanager:UpdateSecretVersionStage',
				'secretsmanager:ListSecrets'
			],
			'Resource': '*',
		}
	],
}


export const ECSReadonlyPolicyDocument : aws.iam.PolicyDocument = {
	'Version': '2012-10-17',
	'Statement': [
		{
			'Sid': 'GetAndListECSResources',
			'Effect': 'Allow',
			'Action': [
				'ecs:ListAttributes',
				'ecs:DescribeTaskSets',
				'ecs:DescribeTaskDefinition',
				'ecs:DescribeClusters',
				'ecs:ListServices',
				'ecs:ListAccountSettings',
				'ecs:ListTagsForResource',
				'ecs:ListTasks',
				'ecs:ListTaskDefinitionFamilies',
				'ecs:DescribeServices',
				'ecs:ListContainerInstances',
				'ecs:DescribeContainerInstances',
				'ecs:DescribeTasks',
				'ecs:ListTaskDefinitions',
				'ecs:ListClusters'
			],
			'Resource': '*',
		}
	],
}

export const SecretsManagerReadPolicyDocument : aws.iam.PolicyDocument =  {
	'Version': '2012-10-17',
	'Statement': [
		{
			'Sid': 'GetTokens',
			'Effect': 'Allow',
			'Action': [
				'secretsmanager:GetRandomPassword',
				'secretsmanager:GetResourcePolicy',
				'secretsmanager:GetSecretValue',
				'secretsmanager:DescribeSecret',
				'secretsmanager:ListSecretVersionIds',
				'secretsmanager:ListSecrets'
			],
			'Resource': '*',
		}
	],
}

export const CloudWatchAndLogsFullAccess: aws.iam.PolicyDocument = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "EC2WinstonCloudwatch",
            "Effect": "Allow",
            "Action": [
                "cloudwatch:*",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}