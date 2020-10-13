import { Request, Response, NextFunction } from 'express'
import { EmailCallbackService } from '@email/services'
import Logger from '@core/logger'

const logger = Logger.loggerWithLabel(module)

const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const authHeader = req.get('authorization')
  if (!authHeader) {
    logger.error({
      message: 'Authorization headers not found',
      action: 'isAuthenticated',
    })
    res.set('WWW-Authenticate', 'Basic realm="Email"')
    return res.sendStatus(401)
  }
  if (EmailCallbackService.isAuthenticated(authHeader)) {
    return next()
  }
  logger.error({
    message: 'Failed to authenticate request',
    action: 'isAuthenticated',
  })
  return res.sendStatus(403)
}

const parseEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    await EmailCallbackService.parseEvent(req)
    logger.info({ message: 'Successfully parsed event', action: 'parseEvent' })
    return res.sendStatus(200)
  } catch (err) {
    next(err)
  }
}

const printConfirmSubscription = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const { Type: type, SubscribeURL: subscribeUrl } = req.body
  if (type === 'SubscriptionConfirmation') {
    const parsed = new URL(req.body['SubscribeURL'])
    if (
      parsed.protocol === 'https:' &&
      /^sns\.[a-zA-Z0-9-]{3,}\.amazonaws\.com(\.cn)?$/.test(parsed.host)
    ) {
      logger.info({
        message: 'Confirm the subscription',
        type,
        subscribeUrl,
        action: 'printConfirmSubscription',
      })
      return res.sendStatus(202)
    }
  }
  return next()
}
export const EmailCallbackMiddleware = {
  isAuthenticated,
  parseEvent,
  printConfirmSubscription,
}
