const handler = async (event: any): Promise<void> => {
  try {
    const { botId } = event.pathParameters
    const body = JSON.parse(event.body)
    console.log(botId, body)

    // TODO: Extract bot_id
    // TODO: Attempt to find a match in stored credentials
    // TODO: Instantiate Telegraf bot and attach handlers
  } catch (err) {
    console.error(err)
  }

  return
}

export { handler }
