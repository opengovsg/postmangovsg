import { Request } from 'express'
import { ensureAttachmentsFieldIsArray } from '@core/utils/attachment'

// Request body fields kept out of the request log: message content and credentials
const REDACTED_BODY_FIELDS = [
  'body',
  'otp',
  'password_hash',
  'twilio_api_secret',
  'telegram_bot_token',
]

/**
 * requestFilter for express-winston's request logger.
 *
 * express-winston calls this with the request, then again with req.body as
 * `req` once per body key. The SES callback route parses its body as text, so
 * that second call receives a string. Mutating a string throws a TypeError
 * after the response is sent, which made the error handler destroy the socket.
 * Non-object values are skipped, so text bodies are not logged.
 */
export const requestLogFilter = (req: Request, propName: string): any => {
  if (typeof req !== 'object' || req === null) {
    return undefined
  }
  if (propName === 'headers' && req.headers?.authorization) {
    // we do this instead of adding it to `headerBlacklist`
    // so we can distinguish if an API call is made via API key
    req.headers.authorization = '[REDACTED]'
  }
  if (propName === 'headers' && req.headers?.cookie) {
    // redact cookies from logs
    // keep header to distinguish if API call is made via cookie
    req.headers.cookie = '[REDACTED]'
  }
  if (propName === 'body' && req.body?.attachments) {
    const { attachments } = req.body
    req.body.attachments = ensureAttachmentsFieldIsArray(attachments).map(
      (attachment) => ({
        // truncate attachment data so the whole file won't get logged and take
        // up our disk space
        ...attachment,
        data: '[REDACTED]',
      })
    )
  }
  if (propName === 'body' && req.body) {
    // Redacted in place: express-winston reads req.body again for the logged body, and
    // this runs when the response ends, after the handlers have read the values
    for (const field of REDACTED_BODY_FIELDS) {
      if (req.body[field]) {
        req.body[field] = '[REDACTED]'
      }
    }
  }
  return (req as any)[propName]
}
