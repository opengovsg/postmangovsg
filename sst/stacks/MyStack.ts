import { StackContext, Api, EventBus, Config, Cron } from "sst/constructs";

export function MyStack({ stack }: StackContext) {
  const POSTMAN_DB_URI = new Config.Secret(stack, "POSTMAN_DB_URI");
  const TEST_ENV_VAR = new Config.Secret(stack, "TEST_ENV_VAR");
  const cron = new Cron(stack, "cron", {
    schedule: "rate(1 minute)",
    job: "packages/functions/src/cron.handler",
  });
  cron.bind([POSTMAN_DB_URI, TEST_ENV_VAR]);
  // TODO
  // cron.attachPermissions()
}
