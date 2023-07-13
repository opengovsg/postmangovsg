import { db } from "../../core/src/dbClient";
import { apiKeys } from "../../core/src/models/api-key";

export async function handler() {
  console.log("Running my cron job");
  console.log({ hi: process.env.IS_LOCAL });
  try {
    const apiKey = await db.select().from(apiKeys).limit(1);
    console.log(apiKey);
  } catch (e) {
    console.log(e);
  }
}
