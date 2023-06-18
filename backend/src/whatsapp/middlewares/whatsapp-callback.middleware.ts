import { Request, Response } from 'express'

import { loggerWithLabel } from '@core/logger'
import config from '@core/config'

const logger = loggerWithLabel(module)

const verifyWebhookChallenge = (req: Request, res: Response) => {
  // see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#create-endpoint
  const verifyToken = config.get('whatsapp.callbackVerifyToken')
  if (req.query['hub.mode'] !== 'subscribe') {
    logger.error({
      message: 'Invalid mode',
      meta: {
        query: req.query,
      },
    })
    res.sendStatus(400)
  }
  if (req.query['hub.verify_token'] !== verifyToken) {
    logger.error({
      message: 'Invalid verify token',
      meta: {
        query: req.query,
      },
    })
    res.sendStatus(403)
  }
  res.status(200).send(req.query['hub.challenge'])
}

const isAuthenticated = (req: Request, res: Response, next: () => void) => {
  console.log({ body: req.body.entry })
  // const body = JSON.parse(req.body)
  // if (body.field !== 'messages') {
  //   res.sendStatus(400)
  // }
  next()
}

const parseEvent = (req: Request, res: Response) => {
  logger.info({
    message: 'Received WhatsApp callback',
    reqBody: req.body,
  })
  res.sendStatus(200)
}

export const WhatsappCallbackMiddleware = {
  verifyWebhookChallenge,
  isAuthenticated,
  parseEvent,
}
