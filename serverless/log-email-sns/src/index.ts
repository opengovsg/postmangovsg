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

    let records: Promise<void>[] = []
    // Check the signatures of events to determine which parser to use
    if (ses.isSnsEvent(event)) {
      // Records is always an array
      const sesSnsEvent = (event as unknown) as ses.SnsEvent
      records = sesSnsEvent.Records.map(({ Sns }) => ses.parseRecord(Sns))
    } else if (ses.isHttpEvent(event)) {
      // body could be one record or an array of records, hence we concat
      const body: ses.SesRecord[] = []
      const sesHttpEvent = body.concat(JSON.parse(event.body))
      records = sesHttpEvent.map(ses.parseRecord)
    } else if (sendgrid.isHttpEvent(event)) {
      // body is always an array
      const sgEvent = JSON.parse(event.body)
      records = sgEvent.map(sendgrid.parseRecord)
    } else {
      throw new Error('Unable to handle this event')
    }

    await Promise.all(records)
  } catch (err) {
    console.error(`Unhandled server error  ${err.name}: ${err.message}`)
    console.error(`Event: ${JSON.stringify(event)}`)
  }
  return
}

