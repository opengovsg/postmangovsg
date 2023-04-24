import { Request } from 'express'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

const parseEvent = async (req: Request): Promise<void> => {
  logger.info('parsing event message', req)
}
export const WhatsappCallbackService = {
  parseEvent,
}
