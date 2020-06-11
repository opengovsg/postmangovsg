import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'
import * as aws from '@pulumi/aws'
import * as fs from 'fs'
import { VPCSettings, EBDomainSettings, EBSettings, RedisSettings, RdsSettings, WorkerEnvVars, BackendEnvVars } from './interfaces'
import * as customParameterGroup from './custom-parameter-group'
import * as customIam from './custom-iam'
const pConfig = new pulumi.Config()
const config = {
	region: aws.config.requireRegion(),
	environment: pConfig.require('environment'),
	jumphostKeyPairName: pConfig.require('jumphostKeyPairName'),
	vpcSettings: pConfig.requireObject<VPCSettings>('vpcSettings'),
	uploadBucketName: pConfig.require('uploadBucketName'),
	ebCertificateARN: pConfig.get('ebCertificateARN'), // Not required
	ebDomainSettings: pConfig.requireObject<EBDomainSettings>('ebDomainSettings'), 
	ebSettings: pConfig.requireObject<EBSettings>('ebSettings'),
	redisSettings: pConfig.requireObject<RedisSettings>('redisSettings'),
	rdsSettings: pConfig.requireObject<RdsSettings>('rdsSettings'),
	rdsMasterUsername: pConfig.requireSecret('rdsMasterUsername'),
	rdsMasterPassword: pConfig.requireSecret('rdsMasterPassword'),
	ecsClusterId: pConfig.get('ecsClusterId'), // Not required,
	// backendEnvVars: pConfig.requireObject<BackendEnvVars>('backendEnvVars'),
	// workerEnvVars: pConfig.requireObject<WorkerEnvVars>('workerEnvVars'),
}
const APP_NAME = `${config.ebSettings.appName}-${config.environment}`

//#region VPC
// Create VPC and Subnets
const vpc = new awsx.ec2.Vpc(APP_NAME, {
	cidrBlock: config.vpcSettings.cidrBlock,
	assignGeneratedIpv6CidrBlock: true,
	enableDnsHostnames: true,
	enableDnsSupport: true,
	instanceTenancy: 'default',
	numberOfAvailabilityZones: 3,
	numberOfNatGateways: 1,
	subnets: [
		{ type: 'public', cidrMask: 24, },
		{ type: 'private',  cidrMask: 24, }
	],
})


// Associate public subnets to 1 route table
// Associate public subnets to 1 route table
// Delete the other route tables
//#endregion

//#region S3 FOR UPLOADS
// Create S3 bucket for uploads
// Add CORS policy to bucket
const uploadBucket = new aws.s3.Bucket(config.uploadBucketName,
	{
		acl: 'private',
		versioning: {
			enabled: true,
		},
		corsRules: [{
			allowedHeaders: ['*'],
			allowedMethods: [
				'PUT',
				'POST',
				'GET'
			],
			allowedOrigins: ['*'],
			exposeHeaders: ['ETag'],
			maxAgeSeconds: 3000,
		}],
	})
//#endregion

//#region JUMPHOST
// Create jumphost security group
const jumphostSecurityGroup = new aws.ec2.SecurityGroup(`${APP_NAME}-jumphost`, {
	description: 'Jumphost allows SSH',
	vpcId: vpc.id,
	ingress: [],
	// ingress: [{
	// 	description: 'Office IP',
	// 	fromPort: 22,
	// 	toPort: 22,
	// 	protocol: 'tcp',
	// 	cidrBlocks: [],
	// }],
	egress: [{
		fromPort: 0,
		toPort: 0,
		protocol: '-1',
		cidrBlocks: ['0.0.0.0/0'],
	}],
})
const jumpHost = new aws.ec2.Instance(`${APP_NAME}-jumphost`, {
	ami: 'ami-0615132a0f36d24f4',
	instanceType: 't3.micro',
	associatePublicIpAddress: true,
	vpcSecurityGroupIds: [jumphostSecurityGroup.id],
	subnetId: pulumi.concat(vpc.publicSubnetIds).apply(o=>{return o.split(',')[0]}),
	keyName: config.jumphostKeyPairName,
})
//#endregion

//#region ELASTIC BEANSTALK
// Create service role
const serviceRole = new aws.iam.Role(`${APP_NAME}-eb-svc-role`,{ assumeRolePolicy: customIam.ebServiceTrustPolicy, })
const serviceRoleAttachment1 = new aws.iam.RolePolicyAttachment(`${APP_NAME}-eb-svc-AWSElasticBeanstalkEnhancedHealth`, {
	role: serviceRole,
	policyArn: aws.iam.ManagedPolicies.AWSElasticBeanstalkEnhancedHealth,
})
const serviceRoleAttachment2 = new aws.iam.RolePolicyAttachment(`${APP_NAME}-eb-svc-AWSElasticBeanstalkService`, {
	role: serviceRole,
	policyArn: aws.iam.ManagedPolicies.AWSElasticBeanstalkService,
})

// Create instance role
const S3BucketManagementPolicy = new aws.iam.Policy(`${config.ebSettings.appName}-S3BucketManagement`, {
	policy: customIam.S3BucketManagementPolicyDocument,
})
const SecretsManagerRW = new aws.iam.Policy(`${config.ebSettings.appName}-SecretsManagerRW`, { 
	policy: customIam.SecretsManagerRWPolicyDocument,
})
const instanceRole =  new aws.iam.Role(`${APP_NAME}-eb-inst-role`,{ assumeRolePolicy: customIam.ebInstanceTrustPolicy, })
const instanceRoleAttachment1 = new aws.iam.RolePolicyAttachment(`${APP_NAME}-eb-inst-AWSElasticBeanstalkWebTier`, {
	role: instanceRole,
	policyArn: aws.iam.ManagedPolicies.AWSElasticBeanstalkWebTier,
})
const instanceRoleAttachment2 = new aws.iam.RolePolicyAttachment(`${APP_NAME}-eb-inst-AWSElasticBeanstalkWorkerTier`, {
	role: instanceRole,
	policyArn: aws.iam.ManagedPolicies.AWSElasticBeanstalkWorkerTier,
})
const instanceRoleAttachment3 = new aws.iam.RolePolicyAttachment(`${APP_NAME}-eb-inst-S3BucketManagementPolicy`, {
	role: instanceRole,
	policyArn: S3BucketManagementPolicy.arn,
})
const instanceRoleAttachment4 = new aws.iam.RolePolicyAttachment(`${APP_NAME}-eb-inst-AWSElasticBeanstalkEnhancedHealth`, {
	role: instanceRole,
	policyArn: SecretsManagerRW.arn,
})

// Create instance profile 
const instanceProfile = new aws.iam.InstanceProfile(`${APP_NAME}-eb-inst-profile`, { role: instanceRole, })

// Create ACM cert
let certificateArn: pulumi.Input<string> = config.ebCertificateARN!

const ebCertificate = new aws.acm.Certificate(`${APP_NAME}-cert`, 
	config.ebDomainSettings,
	(config.ebCertificateARN ? { import: config.ebCertificateARN, } : {})
)
//  This waits for validation to complete
const ebCertificateValidation = new aws.acm.CertificateValidation(`${APP_NAME}-cert`, {
	certificateArn: ebCertificate.arn,
})

certificateArn = ebCertificateValidation?.certificateArn

    
// Create load balancer security group
const loadBalancerSecurityGroup = new aws.ec2.SecurityGroup(`${APP_NAME}-eb-lb`, {
	description: 'EB - Load Balancer allows Cloudflare',
	vpcId: vpc.id,
	ingress: [{
		description: 'Cloudflare',
		fromPort: 443,
		toPort: 443,
		protocol: 'tcp',
		cidrBlocks: '173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/12,172.64.0.0/13,131.0.72.0/22'.split(','),
	}],
	egress: [{
		fromPort: 0,
		toPort: 0,
		protocol: '-1',
		cidrBlocks: ['0.0.0.0/0'],
	}],
})
// Create instance security group
const instanceSecurityGroup = new aws.ec2.SecurityGroup(`${APP_NAME}-eb-inst`, {
	description: 'EB - EC2 allows Load Balancer',
	vpcId: vpc.id,
	ingress: [{
		description: 'EB Load Balancer',
		fromPort: 80,
		toPort: 80,
		protocol: 'tcp',
		securityGroups: [loadBalancerSecurityGroup.id],
	},
	{
		description: 'Jumphost',
		fromPort: 22,
		toPort: 22,
		protocol: 'tcp',
		securityGroups: [jumphostSecurityGroup.id],
	}],
	egress: [{
		fromPort: 0,
		toPort: 0,
		protocol: '-1',
		cidrBlocks: ['0.0.0.0/0'],
	}],
})

// Create application and environment, with HTTPS on the load balancer
const ebApp = new aws.elasticbeanstalk.Application(config.ebSettings.appName, {
	description: config.ebSettings.description,
})
const ebEnv = new aws.elasticbeanstalk.Environment(APP_NAME, {
	application: ebApp.name,
	solutionStackName: config.ebSettings.solutionStackName,
	settings: [
		// Roles
		{ namespace:'aws:elasticbeanstalk:environment', name: 'ServiceRole', value: serviceRole.arn, },
		{ namespace:'aws:autoscaling:launchconfiguration', name: 'IamInstanceProfile', value: instanceProfile.name, },
		// VPC
		{ namespace:'aws:ec2:vpc', name: 'VPCId', value: vpc.id, },
		{ namespace:'aws:ec2:vpc', name: 'Subnets', value:  pulumi.concat(vpc.privateSubnetIds), },
		{ namespace:'aws:ec2:vpc', name: 'ELBSubnets', value: pulumi.concat(vpc.publicSubnetIds), },
		// Load balancer
		{ namespace:'aws:elasticbeanstalk:environment', name: 'LoadBalancerType', value: 'application', },
		{ namespace:'aws:elbv2:listener:443', name: 'ListenerEnabled', value: 'true', },
		{ namespace:'aws:elbv2:listener:443', name: 'SSLCertificateArns', value: certificateArn, },
		{ namespace:'aws:elbv2:listener:443', name: 'SSLPolicy', value: 'ELBSecurityPolicy-TLS-1-2-Ext-2018-06', },
		{ namespace:'aws:elbv2:listener:443', name: 'Protocol', value: 'HTTPS', },
		// Load balancer Security group
		{ namespace: 'aws:elbv2:loadbalancer', name: 'ManagedSecurityGroup', value: loadBalancerSecurityGroup.id, },
		{ namespace: 'aws:elbv2:loadbalancer', name: 'SecurityGroups', value: loadBalancerSecurityGroup.id, },
		// Instance config
		{ namespace:'aws:ec2:instances', name: 'InstanceTypes', value: config.ebSettings.instanceType, },
		{ namespace:'aws:autoscaling:asg', name: 'MinSize', value: String(config.ebSettings.autoScalingMin), },
		{ namespace:'aws:autoscaling:asg', name: 'MaxSize', value: String(config.ebSettings.autoScalingMax), },
		{ namespace: 'aws:elasticbeanstalk:cloudwatch:logs', name: 'StreamLogs', value: 'true', },
		{ namespace:'aws:autoscaling:launchconfiguration', name: 'EC2KeyName', value: config.ebSettings.keyPairName, },
		// Instance security group
		{ namespace:'aws:autoscaling:launchconfiguration', name: 'SecurityGroups', value: instanceSecurityGroup.id, },
		// Command
		{ namespace: 'aws:elasticbeanstalk:command', name: 'Timeout', value: '900', },
		{ namespace: 'aws:elasticbeanstalk:command', name: 'IgnoreHealthCheck', value: 'false', }, 
		{ namespace: 'aws:elasticbeanstalk:command', name: 'DeploymentPolicy', value: config.ebSettings.deploymentPolicy, }
            
	],
}, {
	dependsOn: [vpc],
})
//#endregion ELASTIC BEANSTALK

//#region AMPLIFY
// Amplify -- Not available on pulumi
//#endregion

//#region SERVERLESS/LAMBDAS
// Not implemented yet
const serverlessSecurityGroup = new aws.ec2.SecurityGroup(`${APP_NAME}-serverless`, {
	description: 'Jumphost allows SSH',
	vpcId: vpc.id,
	ingress: [],
	egress: [{
		fromPort: 0,
		toPort: 0,
		protocol: '-1',
		cidrBlocks: ['0.0.0.0/0'],
	}],
})
//#endregion

//#region SERVERLESS/APIGATEWAY
// Not implemented yet
//#endregion

//#region ECR 
// Create a repo
const ecr = new aws.ecr.Repository('postmangovsg')
//#endregion

//#region ECS
// Create role
const ECSReadonly = new aws.iam.Policy(`${config.ebSettings.appName}-ECSRead`, {
	policy: customIam.ECSReadonlyPolicyDocument,
})
const SecretsManagerRead = new aws.iam.Policy(`${config.ebSettings.appName}-SecretsManagerRead`, { 
	policy: customIam.SecretsManagerReadPolicyDocument,
})
const ecsTaskRole =  new aws.iam.Role(`${APP_NAME}-ecs-task-role`,{ assumeRolePolicy: customIam.ecsTrustPolicy, })
const ecsTaskRoleAttachment1 = new aws.iam.RolePolicyAttachment(`${APP_NAME}-ecs-task-AWSElasticBeanstalkWebTier`, {
	role: ecsTaskRole,
	policyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy', // Default
})
const ecsTaskRoleAttachment2 = new aws.iam.RolePolicyAttachment(`${APP_NAME}-ecs-task-ECSReadonly`, {
	role: ecsTaskRole,
	policyArn: ECSReadonly.arn,
})
const ecsTaskRoleAttachment3 = new aws.iam.RolePolicyAttachment(`${APP_NAME}-ecs-task-SecretsManagerRead`, {
	role: ecsTaskRole,
	policyArn: SecretsManagerRead.arn,
})


// Create workers security group
const ecsSecurityGroup = new aws.ec2.SecurityGroup(`${APP_NAME}-ecs-workers`, {
	description: 'ECS Workers',
	vpcId: vpc.id,
	ingress: [],
	egress: [{
		fromPort: 0,
		toPort: 0,
		protocol: '-1',
		cidrBlocks: ['0.0.0.0/0'],
	}],
})

// Create cluster
const clusterName = `${config.ebSettings.appName}-ecs`
const ecsCluster = new awsx.ecs.Cluster(clusterName, {
	vpc: vpc,
	...(config.ecsClusterId ? { cluster: aws.ecs.Cluster.get(clusterName, config.ecsClusterId), } : {}),
})
const ecsImage = awsx.ecs.Image.fromDockerBuild(ecr,{
	context: '../../worker',
	dockerfile: '../../worker/Dockerfile',
})
const ecsSendingService = new awsx.ecs.FargateService(`${APP_NAME}-sending`,{
	cluster: ecsCluster,
	desiredCount: 0,
	assignPublicIp: false,
	deploymentMaximumPercent: 100,
	deploymentMinimumHealthyPercent: 50,
	securityGroups: [ecsSecurityGroup.id],
	platformVersion: '1.4.0',
	taskDefinitionArgs: {
		executionRole: ecsTaskRole,
		containers: {
			sending: {
				image: ecsImage,
			},
		},
	},
})
const ecsLoggingService = new awsx.ecs.FargateService(`${APP_NAME}-logging`,{
	cluster: ecsCluster,
	desiredCount: 0,
	assignPublicIp: false,
	deploymentMaximumPercent: 200,
	deploymentMinimumHealthyPercent: 100,
	securityGroups: [ecsSecurityGroup.id],
	platformVersion: '1.4.0',
	taskDefinitionArgs: {
		executionRole: ecsTaskRole,
		containers: {
			logging: {
				image: ecsImage,
			},
		},
	},
} )
//#endregion

//#region SECRETS MANAGER
// Create secret managers security group
const secretsManagerSecurityGroup = new aws.ec2.SecurityGroup(`${APP_NAME}-sm`, {
	description: 'SecretsManager VPC Endpoint Security Group',
	vpcId: vpc.id,
	ingress: [{
		fromPort: 443,
		toPort: 443,
		protocol: 'tcp',
		securityGroups: [ecsSecurityGroup.id, instanceSecurityGroup.id, serverlessSecurityGroup.id],
	}],
	egress: [{
		fromPort: 0,
		toPort: 0,
		protocol: '-1',
		cidrBlocks: ['0.0.0.0/0'],
	}],
})

// Create VPC endpoint assocated with secret managers' security group
const secretsManagerEndpoint = new aws.ec2.VpcEndpoint(`${APP_NAME}-sm-vpc-endpt`, {
	privateDnsEnabled: true,
	serviceName: `com.amazonaws.${config.region}.secretsmanager`,
	securityGroupIds: [ secretsManagerSecurityGroup.id ] ,
	subnetIds: vpc.privateSubnetIds,
	vpcEndpointType: 'Interface',
	vpcId: vpc.id,
})
//#endregion

//#region DATABASE AND CACHE
// Create database security group
const databaseSecurityGroup = new aws.ec2.SecurityGroup(`${APP_NAME}-db`, {
	description: 'Database security group',
	vpcId: vpc.id,
	ingress: [{
		description: 'Postgres - EB EC2',
		fromPort: 5432,
		toPort: 5432,
		protocol: 'tcp',
		securityGroups: [instanceSecurityGroup.id],
	}, {
		description: 'Redis - EB EC2',
		fromPort: 6379,
		toPort: 6379,
		protocol: 'tcp',
		securityGroups: [instanceSecurityGroup.id],
	},
	{
		description: 'Postgres - ECS Workers',
		fromPort: 5432,
		toPort: 5432,
		protocol: 'tcp',
		securityGroups: [ecsSecurityGroup.id],
	},
	{
		description: 'Postgres - Jumphost',
		fromPort: 5432,
		toPort: 5432,
		protocol: 'tcp',
		securityGroups: [jumphostSecurityGroup.id],
	},
	{
		description: 'Postgres - Serverless',
		fromPort: 5432,
		toPort: 5432,
		protocol: 'tcp',
		securityGroups: [serverlessSecurityGroup.id],
	}],
	egress: [{
		fromPort: 0,
		toPort: 0,
		protocol: '-1',
		cidrBlocks: ['0.0.0.0/0'],
	}],
})


// Create Redis cache for login and sessions, associated with sg-db
const redisSubnetGroup = new aws.elasticache.SubnetGroup(`${APP_NAME}-redis-private`, {
	subnetIds: vpc.privateSubnetIds,
})
const redisCache = new aws.elasticache.Cluster(config.redisSettings.clusterName, {
	engine: 'redis',
	engineVersion: config.redisSettings.engineVersion,
	nodeType: config.redisSettings.nodeType,
	numCacheNodes: 1,
	parameterGroupName: config.redisSettings.parameterGroupName,
	port: 6379, // No replication group
	securityGroupIds: [databaseSecurityGroup.id],
	subnetGroupName: redisSubnetGroup.name,
})
    
// Create RDS for db, associated with sg-db
/*
    Note that the parameter group is not sufficient for audit. 
    You will have to create the role in the db afterwards.
    CREATE ROLE rds_pgaudit;
    CREATE EXTENSION pgaudit;
    ALTER DATABASE <db> set pgaudit.log=‘All’;
    */

const rdsAuditParameterGroup = new aws.rds.ParameterGroup('postgres11-with-audit', {
	family: 'postgres11',
	parameters: customParameterGroup.postgres11WithAudit,
})
const rdsSubnetGroup = new aws.rds.SubnetGroup(`${APP_NAME}-rds-private`, {
	subnetIds: vpc.privateSubnetIds,
})

const rdsInstance = new aws.rds.Instance(`${APP_NAME}-rds`, {
	storageEncrypted: true,
	publiclyAccessible: false,
	instanceClass: config.rdsSettings.instanceClass,
	vpcSecurityGroupIds: [databaseSecurityGroup.id],
	parameterGroupName: rdsAuditParameterGroup.name,
	dbSubnetGroupName: rdsSubnetGroup.name,
	optionGroupName: config.rdsSettings.optionGroupName,
	engineVersion: config.rdsSettings.engineVersion,
	name: config.rdsSettings.dbName,
	password: config.rdsMasterPassword,
	username: config.rdsMasterUsername,
	multiAz: config.rdsSettings.multiAz,
	deletionProtection: config.rdsSettings.deletionProtection,
	engine: 'postgres',
	storageType: 'gp2',
	allocatedStorage: 20,
	maxAllocatedStorage: 1000,
})
//#endregion

//#region Update Workers env var
// ecsSendingService.taskDefinition.containers[0].environment = [
// 	{ name: 'NODE_ENV', value: config.environment, },
// 	{ name: 'ECS_SERVICE_NAME', value: ecsSendingService.service.name, },
// 	{ name: 'DB_URI', value: `postgres://${config.rdsMasterUsername}:${config.rdsMasterPassword}@${rdsInstance.endpoint}/${config.rdsSettings.dbName}`, },
// 	{ name: 'SECRET_MANAGER_SALT', value: config.workerEnvVars.secretManagerSalt, },
// 	{ name: 'MESSAGE_WORKER_SENDER', value: '1', }
// ]
// ecsLoggingService.taskDefinition.containers[0].environment = [
// 	{ name: 'NODE_ENV', value: config.environment, },
// 	{ name: 'ECS_SERVICE_NAME', value: ecsSendingService.service.name, },
// 	{ name: 'DB_URI', value: `postgres://${config.rdsMasterUsername}:${config.rdsMasterPassword}@${rdsInstance.endpoint}/${config.rdsSettings.dbName}`, },
// 	{ name: 'SECRET_MANAGER_SALT', value: config.workerEnvVars.secretManagerSalt, },
// 	{ name: 'MESSAGE_WORKER_LOGGER', value: '1', }
// ]
//#endregion

export const rdsEndpoint = rdsInstance.endpoint
export const ecrRepositoryUrl = ecr.repositoryUrl
export const ecsClusterId = ecsCluster.id
export const ecsClusterName = ecsCluster.cluster.name
export const ecsSendingServiceName = ecsSendingService.service.name
export const ecsLoggingServiceName = ecsLoggingService.service.name