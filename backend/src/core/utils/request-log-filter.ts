import { Request } from 'express'
import { ensureAttachmentsFieldIsArray } from '@core/utils/attachment'

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
  if (propName === 'body' && req.body?.body) {
    // An example of req.body.body is the email body of an email that a user wishes to send
    // We should redact such content as it may contain sensitive information
    req.body.body = '[REDACTED]'
  }
  return (req as any)[propName]
}
