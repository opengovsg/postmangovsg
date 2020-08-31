import { Request, Response } from 'express'
const isAuthenticated = (req: Request, res: Response): Response => {
  if (!req.get('authorization')) {
    res.set('WWW-Authenticate', 'Basic realm="Twilio"')
    res.sendStatus(401)
  }
  return res.sendStatus(401)
}

const parseEvent = (_req: Request, res: Response): Response => {
  return res.sendStatus(200)
}

export const SmsCallbackMiddleware = {
  isAuthenticated,
  parseEvent,
}
