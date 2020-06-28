import { parseEvent } from './parser'
import sequelizeLoader from './sequelize-loader'
import { getBotTokenFromId, verifyBotIdRegistered } from './credentials'
import { handleUpdate } from './bot'

const handler = async (event: any): Promise<{ statusCode: number }> => {
  try {
    // Parse botId and Telegram update
    const { botId, update } = parseEvent(event)

    // Verify botId and fetch bot token
    const sequelize = await sequelizeLoader()
    await verifyBotIdRegistered(botId, sequelize)
    const botToken = await getBotTokenFromId(botId)

    // Handle update
    await handleUpdate(botId, botToken, update, sequelize)
  } catch (err) {
    console.error(`Error: ${err.message}`)
  }

  return {
    statusCode: 200,
  }
}

export { handler }
