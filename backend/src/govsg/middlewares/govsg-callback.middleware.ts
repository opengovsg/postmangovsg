import { loggerWithLabel } from '@core/logger'
import { Request, Response, NextFunction } from 'express'
import { GovsgCallbackService } from '@govsg/services/govsg-callback.service'

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

const parseEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await GovsgCallbackService.parseEvent(req)
    res.sendStatus(200)
  } catch (err) {
    next(err)
  }
}
export const GovsgCallbackMiddleware = {
  isAuthenticated,
  parseEvent,
}
