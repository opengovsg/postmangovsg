import { Request } from 'express'
import { ses, sendgrid } from '@email/utils/callback/parsers'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'

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
      action: 'isAuthenticated',
    })
  return authorized
}

const parseEvent = async (req: Request): Promise<void> => {
  let records: Promise<void>[] = []
  if (ses.isEvent(req)) {
    // body could be one record or an array of records, hence we concat
    const body: ses.SesRecord[] = []
    const sesHttpEvent = body.concat(req.body)
    records = sesHttpEvent.map(ses.parseRecord)
  } else if (sendgrid.isEvent(req)) {
    // body is always an array
    const sgEvent = req.body
    records = sgEvent.map(sendgrid.parseRecord)
  } else {
    throw new Error('Unable to handle this event')
  }
  await Promise.all(records)
}
export const EmailCallbackService = { isAuthenticated, parseEvent }
