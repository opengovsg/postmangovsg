import http from 'http'
import express, { Router, Request, Response, NextFunction } from 'express'

interface TelegramMessage {
  botId: number
  chatId: number
  text: string
  timestamp: number
}

interface BotCommand {
  command: string
  description: string
}

interface BotInfo {
  botId: string
  webhookUrl?: string
  commands?: Array<BotCommand>
}

// In-memory stores for sent messages and bots information
const MESSAGES: Array<TelegramMessage> = []
const BOTS: { [botId: string]: BotInfo } = {}

const getMe = (_req: Request, res: Response) => {
  const { botId } = res.locals
  BOTS[botId] = { botId }

  const result = {
    id: botId,
    is_bot: true,
    first_name: 'Mock Bot',
    username: 'MockBot',
  }

  return res.json({ ok: true, result })
}

const setWebhook = (req: Request, res: Response) => {
  const { botId } = res.locals
  const { url } = req.method === 'POST' ? req.body : req.query
  BOTS[botId].webhookUrl = url as string

  return res.json({
    description: url ? 'Webhook was set' : 'Webhook was deleted',
    ok: true,
    result: true,
  })
}

const setMyCommands = (req: Request, res: Response) => {
  const { botId } = res.locals
  const { commands } = req.body
  BOTS[botId].commands = commands

  return res.json({ ok: true, result: true })
}

const sendMessage = (req: Request, res: Response) => {
  const { botId } = res.locals
  const { chat_id: chatId, text } = req.body
  const timestamp = Math.floor(new Date().getTime() / 1000)
  MESSAGES.push({
    botId,
    chatId: +chatId,
    text,
    timestamp,
  })

  const chat = {
    id: chatId,
    first_name: 'John',
    last_name: 'Doe',
    type: 'private',
    username: 'johndoe',
  }

  const from = {
    first_name: 'Mock Bot',
    id: botId,
    is_bot: true,
    username: 'MockBot',
  }

  const result = {
    chat,
    date: timestamp,
    from,
    message_id: MESSAGES.length,
    text,
  }

  res.json({ ok: true, result })
}

const parseBotToken = (req: Request, res: Response, next: NextFunction) => {
  const { botToken } = req.params
  const botId = parseInt(botToken.split(':')[0])
  if (!botId) throw new Error('Invalid bot token')

  res.locals = { botId }
  return next()
}

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  return res.status(400).json({
    ok: false,
    message: err.message || 'An error has occurred',
  })
}

const mountRoute = (
  router: express.Router,
  path: string,
  handler: express.RequestHandler
) => {
  // Telegram allows both POST and GET
  router.get(path, handler)
  router.post(path, handler)
}

const createMockApiServer = (logApiCalls: boolean): http.Server => {
  const app: express.Application = express()
  app.use(express.json())

  const router = Router({ mergeParams: true })

  router.use(parseBotToken)
  router.use(errorHandler)
  if (logApiCalls) {
    router.use((req: Request, res: Response, next: NextFunction) => {
      const { botId } = res.locals
      console.log(`[${botId}] - ${req.path}`)
      return next()
    })
  }

  mountRoute(router, '/getMe', getMe)
  mountRoute(router, '/setWebhook', setWebhook)
  mountRoute(router, '/setMyCommands', setMyCommands)
  mountRoute(router, '/sendMessage', sendMessage)

  app.get('/messages', (_req: Request, res: Response) =>
    res.json(MockTelegramServer.getMessages())
  )
  app.delete('/messages', (_req: Request, res: Response) => {
    MockTelegramServer.deleteAll()
    return res.sendStatus(200)
  })

  app.use('/bot:botToken', router)

  return http.createServer(app)
}

/**
 * Initialize and start mock Telegram API
 * @param logApiCalls Whether to log API calls to stdout
 * @param port Port to start mock Telegram API on
 */
const start = async (
  logApiCalls = false,
  port = 1081
): Promise<http.Server> => {
  const server = createMockApiServer(logApiCalls)
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Mock Telegram API running at http://0.0.0.0:${port}`)
      resolve(server)
    })
  })
}

/**
 * Retrieve all sent messages
 */
const getMessages = (): Array<TelegramMessage> => {
  return MESSAGES.sort(
    (a: TelegramMessage, b: TelegramMessage) => a.timestamp - b.timestamp
  )
}

/**
 * Get the last message sent to a given chat ID
 * @param chatId
 */
const getLastestMessage = (chatId: number): TelegramMessage => {
  const messages = getMessages()
  return messages.filter((m: TelegramMessage) => m.chatId === chatId).pop()
}

/**
 * Delete all messages
 */
const deleteAll = (): void => {
  MESSAGES.splice(0, MESSAGES.length)
}

/**
 * Retrieve bot info for a given bot
 * @param botId
 */
const getBotInfo = (botId: string): BotInfo | null => {
  return botId in BOTS ? BOTS[botId] : null
}

export const MockTelegramServer = {
  start,
  getMessages,
  getLastestMessage,
  deleteAll,
  getBotInfo,
}
