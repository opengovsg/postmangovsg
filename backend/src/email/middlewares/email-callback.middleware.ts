import { Request, Response, NextFunction } from 'express'
import { EmailCallbackService } from '@email/services'
import { loggerWithLabel } from '@core/logger'
import { tracer } from 'dd-trace'

const logger = loggerWithLabel(module)

const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  tracer.wrap('isAuthenticated', () => {
    const authHeader = req.get('authorization')
    if (!authHeader) {
      // SNS will send 2 request:
      // - first one without the basic authorization first and require the callback
      //   server to respond with 401 WWW-Authenticate Basic realm="Email"
      // - second one with the basic authorization
      // The above mechanism is based on RFC-2671 https://www.rfc-editor.org/rfc/rfc2617.html#page-8
      // Of course, this middleare is to reject all requests without the
      // Authorization header as well
      res.set('WWW-Authenticate', 'Basic realm="Email"')
      return res.sendStatus(401)
    }
    if (EmailCallbackService.isAuthenticated(authHeader)) {
      return next()
    }
    return res.sendStatus(403)
  })
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

const printConfirmSubscription = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const printConfirmSubscriptionSpan = tracer.startSpan(
    'printConfirmSubscription'
  )
  const { Type: type, SubscribeURL: subscribeUrl } = JSON.parse(req.body)
  if (type === 'SubscriptionConfirmation') {
    const parsed = new URL(subscribeUrl)
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
  printConfirmSubscriptionSpan.finish()
  return next()
}
export const EmailCallbackMiddleware = {
  isAuthenticated,
  parseEvent,
  printConfirmSubscription,
}
