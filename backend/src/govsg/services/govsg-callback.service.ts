import config from '@core/config'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

const isAuthenticated = (token: string): boolean => {
  const verifyToken = config.get('whatsapp.callbackVerifyToken')
  return token === verifyToken
}

const parseEvent = async (req: any): Promise<void> => {
  logger.info({
    message: 'Received callback from WhatsApp',
    meta: {
      body: req.body,
    },
  })
  // TODO: parse events here
  const parsed = JSON.stringify(req.body)
  console.log(parsed)
}

export const GovsgCallbackService = { isAuthenticated, parseEvent }
