/**
 * Extracts botId and Telegram update from the Lambda event
 * @param event Lambda event
 */
export const parseEvent = (event: any): { botId: string; update: any } => {
  const { botId } = event.pathParameters
  const update = JSON.parse(event.body)
  if (!(botId && update)) {
    throw new Error('botId and Telegram update must be specified.')
  }

  return { botId, update }
}
