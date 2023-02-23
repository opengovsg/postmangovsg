import { NextFunction, Request, Response } from 'express'
import { SmsCallbackService } from '@sms/services'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.get('authorization')) {
    // Twilio will send 2 request:
    // - first one without the basic authorization first and require the callback
    //   server to respond with 401 WWW-Authenticate Basic realm="Twilio"
    // - second one with the basic authorization
    // More details here https://www.twilio.com/docs/sms/api/message-resource#create-a-message-resource.
    // The above mechanism is based on RFC-2671 https://www.rfc-editor.org/rfc/rfc2617.html#page-8
    // Of course, this middleare is to reject all requests without the
    // Authorization header as well
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

const isAuthenticatedTransactional = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.get('authorization')) {
    res.set('WWW-Authenticate', 'Basic realm="Twilio"')
    return res.sendStatus(401)
  }
  if (
    SmsCallbackService.isAuthenticatedTransactional(req.get('authorization'))
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
    logger.info({ message: 'Successfully parsed event', action: 'parseEvent' })
    return res.sendStatus(200)
  } catch (err) {
    return next(err)
  }
}

const parseTransactionalEvent = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  logger.info({
    message: 'Processing transactional event',
    action: 'parseTransactionalEvent',
  })
  await SmsCallbackService.parseTransactionalEvent(req)
  return res.sendStatus(200)
}

export const SmsCallbackMiddleware = {
  isAuthenticated,
  isAuthenticatedTransactional,
  parseEvent,
  parseTransactionalEvent,
}
