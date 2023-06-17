import { Request, Response } from 'express'

import { loggerWithLabel } from '@core/logger'
import config from '@core/config'

const logger = loggerWithLabel(module)

const verifyWebhookChallenge = (req: Request, res: Response): Response => {
  // see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#create-endpoint
  const verifyToken = config.get('whatsapp.callbackVerifyToken')
  if (req.query['hub.mode'] !== 'subscribe') {
    logger.error({
      message: 'Invalid mode',
      meta: {
        query: req.query,
      },
    })
    return res.sendStatus(400)
  }
  if (req.query['hub.verify_token'] !== verifyToken) {
    logger.error({
      message: 'Invalid verify token',
      meta: {
        query: req.query,
      },
    })
    return res.sendStatus(403)
  }
  return res.status(200).send(req.query['hub.challenge'])
}

export const WhatsappCallbackMiddleware = {
  verifyWebhookChallenge,
}
