import { Request } from 'express'
import { loggerWithLabel } from '@core/logger'
import {
  WhatsappCallbackChangeField,
  WhatsappCallbackPayload,
} from '@shared/clients/whatsapp-client.class/interfaces'

const logger = loggerWithLabel(module)

const parseEvent = async (req: Request): Promise<WhatsappCallbackPayload> => {
  const callbackPayload: WhatsappCallbackPayload = req.body
  // although this is a nested loop, in practice it is only 1 entry
  callbackPayload.entry.map((entry) => {
    entry.changes.map((change) => {
      const wabaId = entry.id
      if (
        change.field ===
        WhatsappCallbackChangeField.MESSAGE_TEMPLATE_STATUS_UPDATE
      ) {
        logger.info({ wabaId, message: change })
      }
    })
  })
  return callbackPayload
}
export const WhatsappCallbackService = {
  parseEvent,
}
