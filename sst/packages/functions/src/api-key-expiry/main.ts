import { eq, sql } from 'drizzle-orm'
import { Config } from 'sst/node/config'

import PostmanDbClient from '@/core/database/client'
import { apiKeys } from '@/core/models'
import { users } from '@/core/models/user'
import { getFutureUTCDate } from '@/core/util/date'
import { sendEmail } from '@/core/util/email'

import { IS_LOCAL, LOCAL_DB_URI } from '../env'

import { reminderEmailMapper } from './helper'

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
          notificationContacts: apiKeys.notificationContacts,
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
          notificationContacts: apiKeys.notificationContacts,
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
          notificationContacts: apiKeys.notificationContacts,
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
          notificationContacts: apiKeys.notificationContacts,
        })
        .from(apiKeys)
        .innerJoin(users, eq(users.id, apiKeys.userId))
        .where(sql`DATE_TRUNC('day', ${apiKeys.validUntil}) = DATE(${oneDay})`),
    ])
  const fourWeeksEmails = reminderEmailMapper(fourWeeksKeys, 'four weeks')
  const twoWeeksEmails = reminderEmailMapper(twoWeeksKeys, 'two weeks')
  const threeDaysEmails = reminderEmailMapper(threeDaysKeys, 'three days')
  const oneDayEmails = reminderEmailMapper(oneDayKeys, 'one day')
  await Promise.all([
    ...fourWeeksEmails.map((email) => sendEmail(email)),
    ...twoWeeksEmails.map((email) => sendEmail(email)),
    ...threeDaysEmails.map((email) => sendEmail(email)),
    ...oneDayEmails.map((email) => sendEmail(email)),
  ])
  console.log('Cron job completed')
}
