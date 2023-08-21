import config from '@core/config'
import { whatsappService } from '@core/services'
import {
  MessageId,
  WhatsAppTemplateMessageToSend,
} from '@shared/clients/whatsapp-client.class/types'

export const sendMessage = async (
  templateMessageToSend: WhatsAppTemplateMessageToSend
): Promise<MessageId> => {
  const isLocal = config.get('env') === 'development'
  const wamid = await whatsappService.whatsappClient.sendTemplateMessage(
    templateMessageToSend,
    isLocal
  )
  return wamid
}
