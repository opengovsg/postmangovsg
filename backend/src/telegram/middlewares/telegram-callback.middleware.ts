import { Request, Response, NextFunction } from 'express'
import { TelegramCallbackService } from '@telegram/services'
import logger from '@core/logger'
const verifyBotIdRegistered = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { botToken } = req.params
    const botId = botToken.split(':')[0]
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
    logger.error(`Could not verify botId: ${err.stack}`)
    return res.sendStatus(200) // On errors, Do not trigger retries by Telegram API
  }
}

const handleUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    await TelegramCallbackService.handleUpdate(
      res.locals.botId,
      res.locals.botToken,
      req.body
    )
    return res.sendStatus(200)
  } catch (err) {
    return next(err)
  }
}
export const TelegramCallbackMiddleware = {
  verifyBotIdRegistered,
  handleUpdate,
}
