import { Sequelize } from 'sequelize-typescript'

import { parseEvent } from './parser'
import sequelizeLoader from './sequelize-loader'
import {
  getBotTokenFromId,
  verifyBotIdRegistered,
  verifyBotToken,
} from './credentials'
import { handleUpdate } from './bot'

let sequelize: Sequelize | undefined

const handler = async (event: any): Promise<{ statusCode: number }> => {
  try {
    if (!sequelize) {
      sequelize = await sequelizeLoader()
    }

    // Parse botToken and Telegram update
    const { botId, botToken: unverifiedBotToken, update } = parseEvent(event)

    // Verify botId, fetch and verify bot token
    await verifyBotIdRegistered(botId, sequelize)
    const botToken = await getBotTokenFromId(botId)
    verifyBotToken(unverifiedBotToken, botToken)

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
