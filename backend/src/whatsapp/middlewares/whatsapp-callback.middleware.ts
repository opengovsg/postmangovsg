import { loggerWithLabel } from '@core/logger'
import { Request, Response } from 'express'
import { WhatsappCallbackService } from '@whatsapp/services'

const logger = loggerWithLabel(module)

const parseEvent = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  await WhatsappCallbackService.parseEvent(req)
  logger.info({ message: 'Successfully parsed event', action: 'parseEvent' })
  return res.sendStatus(200)
}
export const WhatsappCallbackMiddleware = {
  parseEvent,
}
