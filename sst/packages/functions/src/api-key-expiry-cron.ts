import PostmanDbClient from '@postmangovsg-sst/core/src/database/client'
import { apiKeys } from '@postmangovsg-sst/core/src/models'
import { getDayTruncatedISOStringDaysFromNow } from '@postmangovsg-sst/core/src/util/date'
import { sql } from 'drizzle-orm'
import { Config } from 'sst/node/config'

import { IS_LOCAL, LOCAL_DB_URI } from './env'

/*
- This cron job runs every day at 12AM UTC, i.e. 8AM SGT
- It picks up API keys that are expiring at exactly 28 days, 14 days, 3 days and 1 day from now
- For this to be "close enough", we use the DATE_TRUNC("day", valid_until) function to round down the valid_until timestamp to the nearest day
- This means that if a key is expiring at 2021-10-01 12:00:00, it will be picked up by the cron job on 2021-10-01 00:00:00
*/

export async function handler() {
  const dbUri = IS_LOCAL ? LOCAL_DB_URI : Config.POSTMAN_DB_URI
  const db = new PostmanDbClient(dbUri).getClient()
  const fourWeeks = getDayTruncatedISOStringDaysFromNow(28)
  const twoWeeks = getDayTruncatedISOStringDaysFromNow(14)
  const threeDays = getDayTruncatedISOStringDaysFromNow(3)
  const oneDay = getDayTruncatedISOStringDaysFromNow(1)

  const [fourWeeksKeys, twoWeeksKeys, threeDaysKeys, oneDayKeys] =
    await Promise.all([
      await db
        .select()
        .from(apiKeys)
        .where(
          sql`DATE_TRUNC('day', ${apiKeys.validUntil}) = DATE(${fourWeeks})`,
        ),
      await db
        .select()
        .from(apiKeys)
        .where(
          sql`DATE_TRUNC('day', ${apiKeys.validUntil}) = DATE(${twoWeeks})`,
        ),
      await db
        .select()
        .from(apiKeys)
        .where(
          sql`DATE_TRUNC('day', ${apiKeys.validUntil}) = DATE(${threeDays})`,
        ),
      await db
        .select()
        .from(apiKeys)
        .where(sql`DATE_TRUNC('day', ${apiKeys.validUntil}) = DATE(${oneDay})`),
    ])

  // TODO send emails
}
