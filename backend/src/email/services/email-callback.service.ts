import { ses, sendgrid } from '@email/utils/callback/parsers'
const isAuthenticated = (_header: string | undefined): boolean => {
  return true
}
const parseEvent = (_event: any): void => {
  if (ses.isEvent(_event)) {
    ses.parseRecord(_event)
  } else if (sendgrid.isEvent(_event)) {
    sendgrid.parseRecord(_event)
  } else {
    throw new Error('Unable to handle this event')
  }
}
export const EmailCallbackService = { isAuthenticated, parseEvent }
