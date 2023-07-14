import { db } from "@postmangovsg-sst/core/src/dbClient";
import { apiKeys } from "@postmangovsg-sst/core/src/models";

export async function handler() {
  console.log("Running my cron job");
  console.log(process.env.IS_LOCAL);
  console.log(process.env.LOCAL_DB_URI);
  const apiKey = await db.select().from(apiKeys).limit(1);
  console.log(apiKey);
}
