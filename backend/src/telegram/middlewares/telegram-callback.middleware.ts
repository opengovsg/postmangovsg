import { Request, Response, NextFunction } from 'express'
import { TelegramCallbackService } from '@telegram/services'
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
    if (await TelegramCallbackService.verifyBotIdRegistered(botId)) {
      res.locals.botId = botId
      res.locals.botToken = botToken
      return next()
    }
    return res.sendStatus(400)
  } catch (err) {
    return next(err)
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
