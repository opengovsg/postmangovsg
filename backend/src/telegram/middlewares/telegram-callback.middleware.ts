import { Request, Response, NextFunction } from 'express'
import { TelegramCallbackService } from '@telegram/services'
import { loggerWithLabel } from '@shared/core/logger'

const logger = loggerWithLabel(module)

const verifyBotIdRegistered = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { botToken } = req.params
  const botId = botToken.split(':')[0]
  try {
    if (!(botId && req.body)) {
      throw new Error('botId, botToken and Telegram update must be specified.')
    }
    if (!(await TelegramCallbackService.verifyBotIdRegistered(botId))) {
      throw new Error(`botId ${botId} not recognized`)
    }
    res.locals.botId = botId
    res.locals.botToken = botToken
    return next()
  } catch (err) {
    logger.error({
      message: 'Unable to verify botId',
      botId,
      action: 'verifyBotIdRegistered',
    })
    return res.sendStatus(200) // On errors, Do not trigger retries by Telegram API
  }
}

const handleUpdate = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<Response | void> => {
  const { botId, botToken } = res.locals
  try {
    await TelegramCallbackService.handleUpdate(botId, botToken, req.body)
    logger.info({ message: 'Update bot', botId, action: 'handleUpdate' })
    return res.sendStatus(200)
  } catch (err) {
    logger.error({
      error: err,
      botId,
      action: 'handleUpdate',
    })
    return res.sendStatus(200) // On errors, Do not trigger retries by Telegram API
  }
}
export const TelegramCallbackMiddleware = {
  verifyBotIdRegistered,
  handleUpdate,
}
