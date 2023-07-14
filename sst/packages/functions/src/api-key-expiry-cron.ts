import { Config } from "sst/node/config";
import { and, lte, gt } from "drizzle-orm";

import PostmanDbClient from "@postmangovsg-sst/core/src/database/client";
import { apiKeys } from "@postmangovsg-sst/core/src/models";
import { IS_LOCAL, LOCAL_DB_URI } from "./env";

export async function handler() {
  const dbUri = IS_LOCAL ? LOCAL_DB_URI : Config.POSTMAN_DB_URI;
  const db = new PostmanDbClient(dbUri).getClient();
  const timeNow = new Date().getTime();
  const day = 24 * 60 * 60 * 1000;
  const oneMonth = new Date(timeNow + 30 * day).toISOString();
  const twoWeeks = new Date(timeNow + 14 * day).toISOString();
  const threeDays = new Date(timeNow + 3 * day).toISOString();
  const oneDay = new Date(timeNow + day).toISOString();
  /*
  Send emails at the following junctures:
  1 month before the expiry date
  2 weeks before the expiry date
  3 days before the expiry date
  1 day before the expiry date
   */
  const [oneMonthKeys, twoWeeksKeys, threeDaysKeys, oneDayKeys] =
    await Promise.all([
      await db
        .select()
        .from(apiKeys)
        .where(
          and(
            lte(apiKeys.validUntil, oneMonth),
            gt(apiKeys.validUntil, twoWeeks)
          )
        ),
      await db
        .select()
        .from(apiKeys)
        .where(
          and(
            lte(apiKeys.validUntil, threeDays),
            gt(apiKeys.validUntil, oneDay)
          )
        ),
      await db
        .select()
        .from(apiKeys)
        .where(
          and(
            lte(apiKeys.validUntil, twoWeeks),
            gt(apiKeys.validUntil, threeDays)
          )
        ),
      await db.select().from(apiKeys).where(lte(apiKeys.validUntil, oneDay)),
    ]);

  console.log(oneMonthKeys);
}
