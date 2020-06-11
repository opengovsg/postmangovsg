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

export interface BackendEnvVars {
    sessionSecret: string;
    jwtSecret: string;
    secretManagerSalt: string;
    apiKeySalt: string;
}

export interface WorkerEnvVars {
    secretManagerSalt: string;
}