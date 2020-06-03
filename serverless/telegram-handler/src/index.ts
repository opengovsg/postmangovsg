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

    // TODO: Attempt to find a match in stored credentials
    const result = await sequelize.query(`SELECT 1`)
    console.log(result)

    // TODO: Instantiate Telegraf bot and attach handlers
  } catch (err) {
    console.error(`An error occurred: ${err}`)
  }

  return {
    statusCode: 200,
  }
}

export { handler }
