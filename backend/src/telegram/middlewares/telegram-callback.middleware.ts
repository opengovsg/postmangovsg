import { Request, Response, NextFunction } from 'express'
const verifyBotIdRegistered = (
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  return res.sendStatus(403)
}

const addSubscriber = (
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  return res.sendStatus(200)
}

export const TelegramCallbackMiddleware = {
  verifyBotIdRegistered,
  addSubscriber,
}
