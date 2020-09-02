import { Request, Response, NextFunction } from 'express'
import { EmailCallbackService } from '@email/services'

const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (req.body.Type === 'SubscriptionConfirmation') {
    console.log(req.body.SubscribeURL)
  }

  const authHeader = req.get('authorization')
  if (!authHeader) {
    res.set('WWW-Authenticate', 'Basic realm="Email"')
    return res.sendStatus(401)
  }
  if (EmailCallbackService.isAuthenticated(authHeader)) {
    return next()
  }
  return res.sendStatus(401)
}

const parseEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    await EmailCallbackService.parseEvent(req)
    return res.sendStatus(200)
  } catch (err) {
    next(err)
  }
}

export const EmailCallbackMiddleware = {
  isAuthenticated,
  parseEvent,
}
