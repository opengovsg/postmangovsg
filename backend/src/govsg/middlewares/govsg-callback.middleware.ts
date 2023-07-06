import { loggerWithLabel } from '@core/logger'
import { Request, Response, NextFunction } from 'express'
import { GovsgCallbackService } from '@govsg/services/govsg-callback.service'
import {
  MessageIdNotFoundWebhookError,
  UnexpectedWebhookError,
} from '@shared/clients/whatsapp-client.class/errors'
import { WhatsAppApiClient } from '@shared/clients/whatsapp-client.class/types'

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
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      logger.warn({
        message: 'Missing API Client ID',
        meta: {
          query: req.query,
        },
      })
      res.sendStatus(400)
      return
    }
    if (
      id !== WhatsAppApiClient.clientOne &&
      id !== WhatsAppApiClient.clientTwo
    ) {
      logger.warn({
        message: 'Invalid API Client ID',
        meta: {
          query: req.query,
        },
      })
      res.sendStatus(400)
      return
    }
    await GovsgCallbackService.parseWebhook(req.body, id)
    res.sendStatus(200)
  } catch (err) {
    if (err instanceof UnexpectedWebhookError) {
      res.sendStatus(500)
      return
    }
    if (err instanceof MessageIdNotFoundWebhookError) {
      res.sendStatus(400)
      return
    }
    next(err)
  }
}
export const GovsgCallbackMiddleware = {
  isAuthenticated,
  parseWebhook,
}
