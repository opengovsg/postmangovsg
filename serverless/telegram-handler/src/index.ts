import { Sequelize } from 'sequelize-typescript'

import { parseEvent } from './parser'
import sequelizeLoader from './sequelize-loader'
import { verifyBotIdRegistered } from './credentials'
import { handleUpdate } from './bot'

let sequelize: Sequelize | undefined

const handler = async (event: any): Promise<{ statusCode: number }> => {
  try {
    if (!sequelize) {
      sequelize = await sequelizeLoader()
    }

    // Parse botToken and Telegram update
    const { botId, botToken, update } = parseEvent(event)

    // Verify botId
    await verifyBotIdRegistered(botId, sequelize)

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
