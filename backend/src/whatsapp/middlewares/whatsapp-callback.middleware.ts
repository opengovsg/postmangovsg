import { loggerWithLabel } from '@core/logger'
import { NextFunction, Request, Response } from 'express'
import { WhatsappCallbackService } from '../services'

const logger = loggerWithLabel(module)

const parseEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    await WhatsappCallbackService.parseEvent(req)
    logger.info({ message: 'Successfully parsed event', action: 'parseEvent' })
    return res.sendStatus(200)
  } catch (err) {
    return next(err)
  }
}
export const WhatsappCallbackMiddleware = {
  parseEvent,
}
