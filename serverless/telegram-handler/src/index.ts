import sequelizeLoader from './sequelize-loader'

const handler = async (event: any): Promise<{ statusCode: number }> => {
  try {
    // Parse botId and Telegram update
    const { botId } = event.pathParameters
    const update = JSON.parse(event.body)
    if (!(botId && update)) {
      throw new Error('botId and Telegram update must be specified.')
    }

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

    // TODO: Instantiate Telegraf bot and attach handlers
  } catch (err) {
    console.error(`Error: ${err.message}`)
  }

  return {
    statusCode: 200,
  }
}

export { handler }
