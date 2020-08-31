import { Request, Response, NextFunction } from 'express'
import { EmailCallbackService } from '@email/services'

const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (EmailCallbackService.isAuthenticated(req.get('authorization'))) {
    return next()
  }
  return res.sendStatus(401)
}

const parseEvent = (req: Request, res: Response): Response => {
  EmailCallbackService.parseEvent(req.body)
  return res.sendStatus(200)
}

export const EmailCallbackMiddleware = {
  isAuthenticated,
  parseEvent,
}
