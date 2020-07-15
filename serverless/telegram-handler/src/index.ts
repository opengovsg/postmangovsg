import { Sequelize } from 'sequelize-typescript'

import { parseEvent } from './parser'
import sequelizeLoader from './sequelize-loader'
import { getBotTokenFromId, verifyBotIdRegistered } from './credentials'
import { handleUpdate } from './bot'

let sequelize: Sequelize | undefined

const handler = async (event: any): Promise<{ statusCode: number }> => {
  try {
    if (!sequelize) {
      sequelize = await sequelizeLoader()
    }

    // Parse botId and Telegram update
    const { botId, update } = parseEvent(event)

    // Verify botId and fetch bot token
    await verifyBotIdRegistered(botId, sequelize)
    const botToken = await getBotTokenFromId(botId)

    // Handle update
    await handleUpdate(botId, botToken, update, sequelize)
  } catch (err) {
    console.error(err)
  }

  return {
    statusCode: 200,
  }
}

export { handler }
