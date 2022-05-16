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
export const countQueryHelper = async (countQuery: string): Promise<number> => {
  const query = (await sequelize?.query(countQuery, {
    type: QueryTypes.SELECT,
    useMaster: false,
  })) as Array<CountQueryResult>

  return query?.[0]?.count || 0
}

export const getAgenciesCount = async (): Promise<number> => {
  return countQueryHelper('SELECT COUNT(*) FROM agencies')
}

export const getCampaignsCount = async (): Promise<number> => {
  return countQueryHelper('SELECT COUNT(*) FROM campaigns')
}

export const getPreviousDayMessageCount = async (
  messageTable: string
): Promise<number> => {
  const today = new Date()

  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1
  )
  return countQueryHelper(
    `SELECT
      COUNT(*)
    FROM
      ${messageTable}
    WHERE
      delivered_at BETWEEN '${convertToYYYYMMDD(
        yesterday
      )} 00:00:00':: TIMESTAMP
      AND '${convertToYYYYMMDD(today)} 00:00:00':: TIMESTAMP`
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
 Number of agencies onboarded: ${await getAgenciesCount()}
 Number of campaigns conducted: ${await getCampaignsCount()}
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
