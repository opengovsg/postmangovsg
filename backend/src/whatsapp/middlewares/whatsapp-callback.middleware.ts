import { loggerWithLabel } from '@core/logger'
import { Request, Response } from 'express'
import { WhatsappCallbackService } from '@whatsapp/services'

const logger = loggerWithLabel(module)

const parseEvent = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  let resp
  try {
    resp = await WhatsappCallbackService.parseEvent(req)
  } catch (err) {
    logger.error({ message: err, action: 'parseEvent' })
    res.sendStatus(400)
  }
  return res.json(resp)
}
export const WhatsappCallbackMiddleware = {
  parseEvent,
}
