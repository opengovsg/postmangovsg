import { StackContext, Config, Cron, Stack } from "sst/constructs";

export function MyStack({ stack }: StackContext) {
  const cron = new Cron(stack, "cron", {
    schedule: "rate(1 hour)",
    job: "packages/functions/src/cron.handler",
  });
  cron.attachPermissions(getPermissions());
  cron.bind([...getEnvVars(stack)]);
  // TODO
  // cron.attachPermissions()
}

function getEnvVars(stack: Stack) {
  return [new Config.Secret(stack, "POSTMAN_DB_URI")];
}

function getPermissions() {
  return [
    "ec2:DescribeNetworkInterfaces",
    "ec2:CreateNetworkInterface",
    "ec2:DeleteNetworkInterface",
    "ec2:DescribeInstances",
    "ec2:AttachNetworkInterface",
  ];
}
