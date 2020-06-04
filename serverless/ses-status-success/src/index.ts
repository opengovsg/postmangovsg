import sequelizeLoader from './sequelize-loader'
import { QueryTypes } from 'sequelize'

exports.handler = async (event: any) => {
  try {
    const sequelize = await sequelizeLoader()

    const message = JSON.parse(event.Records[0].Sns.Message)

    const messageId = message?.mail?.commonHeaders?.messageId
    console.log(messageId)

    const timeStamp = message?.delivery?.timestamp
    console.log(timeStamp)

    await sequelize.query(
      `UPDATE email_messages SET received_at=timeStamp, updated_at = clock_timestamp() WHERE id=messageId`,
      {
        replacements: { timeStamp, messageId }, type: QueryTypes.UPDATE,
      })
    return {
      statusCode: 200,
      body: 'Ok'
    }

  } catch(err) {
    console.error(`Unhandled server error  ${err.name}: ${err.message}`)
    console.error(`Event: ${JSON.stringify(event)}`)

    return {
      statusCode: 500
    }
  }
}