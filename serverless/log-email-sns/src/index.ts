import * as ses from './parsers/ses'
import * as sendgrid from './parsers/sendgrid'
import { init } from './query'

/**
 *  Lambda to update the email delivery status.
 *  SNS triggers it whenever it receives a new notification from SES.
 *  @param event
 */
exports.handler = async (event: any) => {
  try {
    await init()
    if (ses.isSESEvent(event)) {
      const sesEvent: ses.SESEvent = (event as unknown) as ses.SESEvent
      await Promise.all(sesEvent.Records.map(({ Sns }) => ses.parseRecord(Sns)))
    } else if (sendgrid.isSendgridEvent(event)) {
      const sgEvent: sendgrid.SendgridEvent = { body: JSON.parse(event.body) }
      await Promise.all(sgEvent.body.map(sendgrid.parseRecord))
    } else {
      console.error('Unable to handle this event')
    }

    return {
      statusCode: 200,
      body: 'Ok',
    }
  } catch (err) {
    console.error(`Unhandled server error  ${err.name}: ${err.message}`)
    console.error(`Event: ${JSON.stringify(event)}`)

    return {
      statusCode: 500,
    }
  }
}
