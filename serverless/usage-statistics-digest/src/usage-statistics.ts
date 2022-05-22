import { QueryTypes, Sequelize } from 'sequelize'
import axios from 'axios'

import config from './config'
import sequelizeLoader from './sequelize-loader'
import { CountQueryResult } from './interface'

const slackWebhookUrl = config.get('slackWebhookUrl')

const client = axios.create({
  baseURL: slackWebhookUrl,
  timeout: 4000,
})

let sequelize: Sequelize | undefined

export const init = async (): Promise<void> => {
  if (!sequelize) {
    sequelize = await sequelizeLoader()
  }
}

/*
 * Helper function for querying database for a count
 * */
interface TimeRange {
  start: string
  end: string
}
export const countQueryHelper = async (
  countQuery: string,
  timeRange?: TimeRange
): Promise<number> => {
  const queryOptions = {
    type: QueryTypes.SELECT,
    useMaster: false,
    replacements: timeRange ? [timeRange.start, timeRange.end] : [],
  }

  const query = (await sequelize?.query(
    countQuery,
    queryOptions
  )) as Array<CountQueryResult>
  return query?.[0]?.count || 0
}

export const getCumulativeAgenciesCount = async (): Promise<number> => {
  return countQueryHelper('SELECT COUNT(*) FROM agencies')
}

export const getCumulativeCampaignsCount = async (): Promise<number> => {
  return countQueryHelper('SELECT COUNT(*) FROM campaigns')
}

export const getPreviousDayMessageCount = async (
  messageTable: string
): Promise<number> => {
  const nowUTC = new Date()
  const nowGMT8 = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000)
  const todayYYYYMMDD = convertToYYYYMMDD(nowGMT8)
  const yesterdayYYYYMMDD = convertToYYYYMMDD(
    new Date(nowGMT8.getTime() - 24 * 60 * 60 * 1000)
  )
  const startTimestamp = `${yesterdayYYYYMMDD} 00:00:00':: TIMESTAMP`
  const endTimestamp = `${todayYYYYMMDD} 00:00:00':: TIMESTAMP`
  return countQueryHelper(
    `SELECT
      COUNT(*)
    FROM
      ${messageTable}
    WHERE
       delivered_at BETWEEN ? AND ?`,
    { start: startTimestamp, end: endTimestamp }
  )
}

export const getPreviousDaySMSCount = async (): Promise<number> => {
  return getPreviousDayMessageCount('sms_messages')
}
export const getPreviousDayEmailCount = async (): Promise<number> => {
  return getPreviousDayMessageCount('email_messages')
}
export const getPreviousDayTelegramMessageCount = async (): Promise<number> => {
  return getPreviousDayMessageCount('telegram_messages')
}

export const generateUsageStatisticsDigest = async (): Promise<string> => {
  // weird single spacing is a compromise between Prettier and working with Slack API
  // for Slack's formatting rules, see https://api.slack.com/reference/surfaces/formatting
  // for interactivity, use Slack Block Kit: https://api.slack.com/reference/block-kit/
  const today = new Date()
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1
  )

  return `*Postman Usage Statistics Digest*
 Number of agencies onboarded: ${await getCumulativeAgenciesCount()}
 Number of campaigns conducted: ${await getCumulativeCampaignsCount()}
 Total number of messages sent on ${yesterday.toDateString()}:
 • SMS: ${await getPreviousDaySMSCount()}
 • Email: ${await getPreviousDayEmailCount()}
 • Telegram: ${await getPreviousDayTelegramMessageCount()}
 Have a nice day!`
}

const convertToYYYYMMDD = (date: Date): string => {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD
}

export const sendDigestToSlackChannel = async (
  digest: string
): Promise<void> => {
  await client.post(
    slackWebhookUrl,
    {
      text: digest,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}
