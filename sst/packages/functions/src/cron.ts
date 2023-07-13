import { Config } from "sst/node/config";

export async function handler() {
  console.log("Running my cron job");
  console.log(Config.TEST_ENV_VAR);
}
