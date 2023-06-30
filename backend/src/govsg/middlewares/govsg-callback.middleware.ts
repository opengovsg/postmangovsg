import { loggerWithLabel } from '@core/logger'
import { Request, Response, NextFunction } from 'express'
import { GovsgCallbackService } from '@govsg/services/govsg-callback.service'
import { UnexpectedWebhookError } from '@shared/clients/whatsapp-client.class/errors'

const logger = loggerWithLabel(module)

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const { auth } = req.query
  if (!auth || typeof auth !== 'string') {
    logger.error({
      message: 'Missing authentication token',
      meta: {
        query: req.query,
      },
    })
    res.sendStatus(400)
    return
  }
  if (!GovsgCallbackService.isAuthenticated(auth)) {
    logger.error({
      message: 'Invalid authentication token',
      meta: {
        query: req.query,
      },
    })
    res.sendStatus(400)
    return
  }
  next()
}

const parseWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await GovsgCallbackService.parseWebhook(req.body)
    res.sendStatus(200)
  } catch (err) {
    if (err instanceof UnexpectedWebhookError) {
      res.sendStatus(500)
      return
    }
    next(err)
  }
}
export const GovsgCallbackMiddleware = {
  isAuthenticated,
  parseWebhook,
}
