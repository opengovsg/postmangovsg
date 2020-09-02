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

const parseEvent = async (req: Request, res: Response): Promise<Response> => {
  await SmsCallbackService.parseEvent(req)
  return res.sendStatus(200)
}

export const SmsCallbackMiddleware = {
  isAuthenticated,
  parseEvent,
}
