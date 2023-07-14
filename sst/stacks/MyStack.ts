import { StackContext, Config, Cron, Stack } from "sst/constructs";

export function MyStack({ stack }: StackContext) {
  const apiKeyExpiryCron = new Cron(stack, "cron", {
    // TODO: set this to every day at 12am
    schedule: "rate(1 hour)",
    job: "packages/functions/src/api-key-expiry-cron.handler",
  });
  apiKeyExpiryCron.attachPermissions(getPermissions());
  apiKeyExpiryCron.bind(getSecrets(stack));
}

function getSecrets(stack: Stack) {
  return [new Config.Secret(stack, "POSTMAN_DB_URI")];
}

function getPermissions() {
  return [
    // necessary to change VPC of Lambda to VPC of RDS
    "ec2:DescribeNetworkInterfaces",
    "ec2:CreateNetworkInterface",
    "ec2:DeleteNetworkInterface",
    "ec2:DescribeInstances",
    "ec2:AttachNetworkInterface",
  ];
}
