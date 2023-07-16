import { users } from '@postmangovsg-sst/core/models/user'
import PostmanDbClient from '@postmangovsg-sst/core/src/database/client'
import { apiKeys } from '@postmangovsg-sst/core/src/models'
import { getFutureUTCDate } from '@postmangovsg-sst/core/src/util/date'
import { sendEmail } from '@postmangovsg-sst/core/src/util/email'
import { eq, sql } from 'drizzle-orm'
import { Config } from 'sst/node/config'

import { IS_LOCAL, LOCAL_DB_URI } from '../env'

/*
- This cron job runs every day at 12AM UTC, i.e. 8AM SGT
- It picks up API keys that are expiring at exactly 28 days, 14 days, 3 days and 1 day from now
- DATE_TRUNC("day", valid_until) function round down the valid_until timestamp to the nearest day
- The cron job will send emails to the API key owners to remind them to renew their API keys
*/

export async function handler() {
  const dbUri = IS_LOCAL ? LOCAL_DB_URI : Config.POSTMAN_DB_URI
  const db = new PostmanDbClient(dbUri).getClient()
  const fourWeeks = getFutureUTCDate(28)
  const twoWeeks = getFutureUTCDate(14)
  const threeDays = getFutureUTCDate(3)
  const oneDay = getFutureUTCDate(1)

  const [fourWeeksKeys, twoWeeksKeys, threeDaysKeys, oneDayKeys] =
    await Promise.all([
      await db
        .select({
          userEmail: users.email,
          apiKeyLabel: apiKeys.label,
          validUntil: apiKeys.validUntil,
          apiKeyLastFiveChars: apiKeys.lastFive,
        })
        .from(apiKeys)
        .innerJoin(users, eq(users.id, apiKeys.userId))
        .where(
          sql`DATE_TRUNC('day', ${apiKeys.validUntil}) = DATE(${fourWeeks})`,
        ),
      await db
        .select({
          userEmail: users.email,
          apiKeyLabel: apiKeys.label,
          validUntil: apiKeys.validUntil,
          apiKeyLastFiveChars: apiKeys.lastFive,
        })
        .from(apiKeys)
        .innerJoin(users, eq(users.id, apiKeys.userId))
        .where(
          sql`DATE_TRUNC('day', ${apiKeys.validUntil}) = DATE(${twoWeeks})`,
        ),
      await db
        .select({
          userEmail: users.email,
          apiKeyLabel: apiKeys.label,
          validUntil: apiKeys.validUntil,
          apiKeyLastFiveChars: apiKeys.lastFive,
        })
        .from(apiKeys)
        .innerJoin(users, eq(users.id, apiKeys.userId))
        .where(
          sql`DATE_TRUNC('day', ${apiKeys.validUntil}) = DATE(${threeDays})`,
        ),
      await db
        .select({
          userEmail: users.email,
          apiKeyLabel: apiKeys.label,
          validUntil: apiKeys.validUntil,
          apiKeyLastFiveChars: apiKeys.lastFive,
        })
        .from(apiKeys)
        .innerJoin(users, eq(users.id, apiKeys.userId))
        .where(sql`DATE_TRUNC('day', ${apiKeys.validUntil}) = DATE(${oneDay})`),
    ])
  console.log({ fourWeeksKeys, twoWeeksKeys, threeDaysKeys, oneDayKeys })
  // await sendEmail({
  //   recipient: 'zixiang@open.gov.sg',
  //   body: 'bodyyy',
  //   subject: 'subjecttt',
  //   tag: 'taggg',
  // })
}
