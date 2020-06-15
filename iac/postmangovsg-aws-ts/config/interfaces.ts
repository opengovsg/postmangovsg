export interface VPCSettings {
    cidrBlock : string;
}

export interface EBDomainSettings {
    domainName: string;
    subjectAlternativeNames: string[],
    validationMethod: string;
}
//https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-beanstalk-environment.html#cfn-beanstalk-environment-platformarn
export interface EBSettings {
    appName: string;
    description: string; 
    solutionStackName: string; // If you specify SolutionStackName, don't specify PlatformArn or TemplateName.
    instanceType: string;
    autoScalingMin: number;
    autoScalingMax: number;
    deploymentPolicy: string;
    keyPairName: string;
}

export interface RedisSettings {
    clusterName: string; //has to be <=12 characters
    nodeType: string;
    parameterGroupName: string;
    engineVersion: string;
}

export interface RdsSettings {
    instanceClass: string;
    engineVersion: string;
    optionGroupName: string;
    dbName: string;
    multiAz: boolean;
    deletionProtection: boolean;
}

export interface EBEnvVars {
    NODE_ENV: string;
    DOMAIN_WHITELIST: string;
    DB_URI: string;
    REDIS_SESSION_URI: string;
    REDIS_OTP_URI: string;
    SES_USER: string;
    SES_PASS: string;
    SES_HOST: string;
    SES_PORT: string;
    SECRET_MANAGER_SALT: string;
    API_KEY_SALT_V1: string;
    JWT_SECRET: string;
    AWS_LOG_GROUP_NAME: string;
    SENTRY_DSN: string;
    COOKIE_NAME: string;
    SESSION_SECRET: string;
}

export interface WorkerEnvVars {
    NODE_ENV: string;
    ECS_SERVICE_NAME: string;
    DB_URI: string;
    SECRET_MANAGER_SALT: string;
    MESSAGE_WORKER_SENDER: string;
    MESSAGE_WORKER_LOGGER:  string
}