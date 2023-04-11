import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

const sendMessage = () => {
  logger.info('sending message')
}
export const WhatsappService = {
  sendMessage,
}
