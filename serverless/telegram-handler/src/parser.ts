import { Update } from 'telegraf/typings/telegram-types'

/**
 * Extracts botId, botToken and Telegram update from the Lambda event
 *
 * For reference, botToken = botId:botSecret.
 */
export const parseEvent = (
  event: any
): { botId: string; botToken: string; update: Update } => {
  const { botToken } = event.pathParameters
  const botId = botToken.split(':')[0]
  const update = JSON.parse(event.body)

  if (!(botId && update)) {
    throw new Error('botId, botToken and Telegram update must be specified.')
  }

  return { botId, botToken, update }
}
