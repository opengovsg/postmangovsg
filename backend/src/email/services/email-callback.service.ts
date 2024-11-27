import { Request } from 'express'
import { ses, sendgrid } from '@email/utils/callback/parsers'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { tracer } from 'dd-trace'

const logger = loggerWithLabel(module)

const isAuthenticated = (authHeader?: string): boolean => {
  const headerKey = 'Basic'
  if (!authHeader) return false

  const [header, secret] = authHeader.trim().split(' ')
  if (headerKey !== header) return false

  const decoded = Buffer.from(secret, 'base64').toString('utf8')
  const authorized = decoded === config.get('emailCallback.callbackSecret')
  if (!authorized)
    logger.info({
      message: 'Request made with incorrect credential',
      decoded,
      action: 'isAuthenticated',
    })
  return authorized
}

const parseEvent = async (req: Request): Promise<void> => {
  const parseJsonSpan = tracer.startSpan('parseJson', {
    childOf: tracer.scope().active() || undefined,
  })
  const parsed = JSON.parse(req.body)
  parseJsonSpan.finish()
  let records: Promise<void>[] = []
  if (ses.isEvent(req)) {
    // body could be one record or an array of records, hence we concat
    const body: ses.SesRecord[] = []
    const sesHttpEvent = body.concat(parsed)
    const parseAllRecordsSpan = tracer.startSpan('parseAllRecords', {
      childOf: tracer.scope().active() || undefined,
    })
    records = sesHttpEvent.map(ses.parseRecord)
    parseAllRecordsSpan.finish()
  } else if (sendgrid.isEvent(req)) {
    // body is always an array
    const sgEvent = parsed
    records = sgEvent.map(sendgrid.parseRecord)
  } else {
    throw new Error('Unable to handle this event')
  }
  const parseNotificationAndEventSpan = tracer.startSpan(
    'parseAllNotificationAndEvents',
    { childOf: tracer.scope().active() || undefined }
  )
  await Promise.all(records)
  parseNotificationAndEventSpan.finish()
}
export const EmailCallbackService = { isAuthenticated, parseEvent }
