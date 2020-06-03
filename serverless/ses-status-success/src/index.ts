exports.handler = async (event: any) => {
  try {
    const message = JSON.parse(event.Records[0].Sns.Message)

    const messageId = message?.mail?.commonHeaders?.messageId
    console.log(messageId)

    const timestamp = message?.delivery?.timestamp
    console.log(timestamp)
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