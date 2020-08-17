import http from 'http'
import { customAlphabet } from 'nanoid'
import express, { Router, Request, Response, NextFunction } from 'express'

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 32)

interface SmsMessage {
  to: string
  from: string
  body: string
  timestamp: number
}

/**
 * Check if the 'To' number matches a magic number listed at https://www.twilio.com/docs/iam/test-credentials
 * @param to Phone number to send to
 * @param from Phone number or message service SID to send from
 */
const matchMagicNumber = (
  to: string,
  from: string
): {
  code: string | null
  message: string | null
} => {
  let code = null
  let message = null

  switch (to) {
    case '+15005550001':
      code = 21211
      message = `The 'To' number ${to} is not a valid phone number.`
      break
    case '+15005550002':
      code = 21612
      message = `The 'To' phone number: ${to}, is not currently reachable using the 'From' phone number: ${from} via SMS.`
      break
    case '+15005550003':
      code = 21408
      message = `Permission to send an SMS has not been enabled for the region indicated by the 'To' number: ${to}.`
      break
    case '+15005550004':
      code = 21610
      message = 'The message From/To pair violates a blacklist rule.'
      break
    case '+15005550009':
      code = 21614
      message = `To number: ${to}, is not a mobile number`
      break
  }

  return { code, message }
}

const MESSAGES: Array<SmsMessage> = []

const sendMessage = (req: Request, res: Response) => {
  const { apiVersion, accountSid } = req.params
  const { To: to, From: from, Body: body } = req.body

  const sid = `SM${nanoid()}`
  const timestamp = new Date()
  const timestampRfc2822 = timestamp.toUTCString().replace('GMT', '+0000')
  const timestampSeconds = Math.floor(timestamp.getTime() / 1000)

  MESSAGES.push({ to, from, body, timestamp: timestampSeconds })

  // TODO: Trigger callbacks
  const { code, message } = matchMagicNumber(to, from)
  if (code) {
    return res.status(400).json({
      code,
      message,
      more_info: `https://www.twilio.com/docs/errors/${code}`,
      status: 400,
    })
  }

  return res.status(201).json({
    account_sid: accountSid,
    api_version: apiVersion,
    body,
    date_created: timestampRfc2822,
    date_sent: timestampRfc2822,
    date_updated: timestampRfc2822,
    direction: 'outbound-api',
    error_code: code,
    error_message: message,
    from,
    messaging_service_id: null,
    num_media: 0,
    num_segments: 1,
    price: null,
    price_unit: 'USD',
    sid,
    status: 'queued',
    subresource_uri: {
      media: `/${apiVersion}/Accounts/${accountSid}/Messages/${sid}/Media.json`,
    },
    to,
    uri: `/${apiVersion}/Accounts/${accountSid}/Messages/${sid}.json`,
  })
}

const createMockApiServer = (logApiCalls: boolean): http.Server => {
  const app: express.Application = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  const router = Router({ mergeParams: true })
  if (logApiCalls) {
    router.use((req: Request, _res: Response, next: NextFunction) => {
      const { accountSid } = req.params
      console.log(`[${accountSid}] - ${req.path}`)
      return next()
    })
  }

  router.post('/Messages.json', sendMessage)

  app.get('/messages', (_req: Request, res: Response) =>
    res.json(MockTwilioServer.getMessages())
  )
  app.delete('/messages', (_req: Request, res: Response) => {
    MockTwilioServer.deleteAll()
    return res.sendStatus(200)
  })

  app.use('/:apiVersion/Accounts/:accountSid', router)

  return http.createServer(app)
}

/**
 * Initialize and start mock Twilio API
 * @param logApiCalls Whether to log API calls to stdout
 * @param port Port to start mock Telegram API on
 */
const start = async (
  logApiCalls = false,
  port = 1082
): Promise<http.Server> => {
  const server = createMockApiServer(logApiCalls)

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Mock Twilio API running at http://0.0.0.0:${port}`)
      resolve(server)
    })
  })
}

/**
 * Retrieve all sent messages
 */
const getMessages = (): Array<SmsMessage> => {
  return MESSAGES.sort(
    (a: SmsMessage, b: SmsMessage) => a.timestamp - b.timestamp
  )
}

/**
 * Get the last message sent to a given phone number
 * @param phoneNumber
 */
const getLastestMessage = (phoneNumber: string): SmsMessage => {
  const messages = getMessages()
  return messages.filter((m: SmsMessage) => m.to === phoneNumber).pop()
}

/**
 * Delete all messages
 */
const deleteAll = (): void => {
  MESSAGES.splice(0, MESSAGES.length)
}

export const MockTwilioServer = {
  start,
  getMessages,
  getLastestMessage,
  deleteAll,
}
