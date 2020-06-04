import { parseEvent } from './parser'
import sequelizeLoader from './sequelize-loader'
import { getBotTokenFromId } from './credential'
import { handleUpdate } from './bot'

const handler = async (event: any): Promise<{ statusCode: number }> => {
  try {
    // Parse botId and Telegram update
    const { botId, update } = parseEvent(event)

    // Get database connection
    const sequelize = await sequelizeLoader()

    // Verify that this is a registered bot
    const { exists: botIdExists } = await sequelize.query(
      `SELECT EXISTS (SELECT * FROM credentials WHERE name = :botId);`,
      {
        replacements: {
          botId,
        },
        plain: true,
      }
    )
    if (!botIdExists) {
      throw new Error(`botId ${botId} not recognized.`)
    }

    const botToken = await getBotTokenFromId(botId)

    // Handle update
    await handleUpdate(update, botToken)
  } catch (err) {
    console.error(`Error: ${err.message}`)
  }

  return {
    statusCode: 200,
  }
}

export { handler }
