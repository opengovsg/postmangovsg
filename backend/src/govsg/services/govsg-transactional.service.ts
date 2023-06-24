import {
  ApiBadGatewayError,
  ApiInvalidRecipientError,
} from '@core/errors/rest-api.errors'
import { loggerWithLabel } from '@core/logger'
import { WhatsAppService } from '@core/services/whatsapp.service'
import {
  MessageId,
  WhatsAppApiClient,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/interfaces'

const logger = loggerWithLabel(module)

async function sendMessage({
  recipient,
  templateName,
  params,
}: {
  recipient: string
  templateName: string
  params: Record<string, string> | null
}): Promise<MessageId> {
  const action = 'sendMessage'
  logger.info({ message: 'Sending GovSG message', action })
  /*   Overview of sending logic
  1. DB models to query flamingo db to decide which API client to use
  2. Call WhatsApp contacts endpoint to validate user
  3. Send templated message to user
  For now, will just do 2 and 3 to test workflow. Add 1 afterwards
  */
  const messageToSend = {
    to: recipient,
    templateName,
    components: params,
    apiClient: WhatsAppApiClient.clientOne, // to parameterize after adding flamingo db query
    language: WhatsAppLanguages.english,
  }
  await WhatsAppService.whatsappClient
    .validateSingleRecipient(messageToSend)
    .catch((err) => {
      logger.error({
        message: 'Error validating recipient',
        action,
        error: err,
      })
      throw new ApiInvalidRecipientError(err.message)
    })

  const messageId = await WhatsAppService.whatsappClient
    .sendMessage(messageToSend)
    .catch((err) => {
      logger.error({
        message: 'Error sending message',
        action,
        error: err,
      })
      throw new ApiBadGatewayError(err.message)
    })
  return messageId
}

export const GovsgTransactionalService = {
  sendMessage,
  // handleStatusCallback,
}
