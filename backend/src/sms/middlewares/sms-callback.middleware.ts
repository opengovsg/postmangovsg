import { Request, Response, NextFunction } from 'express'
import { SmsCallbackService } from '@sms/services'
const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.get('authorization')) {
    res.set('WWW-Authenticate', 'Basic realm="Twilio"')
    return res.sendStatus(401)
  }
  const { messageId, campaignId } = req.params
  if (
    SmsCallbackService.isAuthenticated(
      messageId,
      campaignId,
      req.get('authorization')
    )
  ) {
    return next()
  }
  return res.sendStatus(403)
}

const parseEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    await SmsCallbackService.parseEvent(req)
    return res.sendStatus(200)
  } catch (err) {
    return next(err)
  }
}

export const SmsCallbackMiddleware = {
  isAuthenticated,
  parseEvent,
}
