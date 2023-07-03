import config from '@core/config'
import {
  ApiBadGatewayError,
  ApiInvalidRecipientError,
} from '@core/errors/rest-api.errors'
import { loggerWithLabel } from '@core/logger'
import { WhatsAppService } from '@core/services/whatsapp.service'
import {
  MessageId,
  NormalisedParam,
  WhatsAppApiClient,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'

const logger = loggerWithLabel(module)

async function sendMessage({
  recipient,
  templateName,
  params,
}: {
  recipient: string
  templateName: string
  params: NormalisedParam[]
}): Promise<MessageId> {
  const action = 'sendMessage'
  logger.info({ message: 'Sending GovSG message', action })
  /*   Overview of sending logic
  1. DB models to query flamingo db to decide which API client to use
  2. Call WhatsApp contacts endpoint to validate user
  3. Send templated message to user
  */
  const apiClientIdMap = await WhatsAppService.flamingoDbClient.getApiClientId([
    recipient,
  ])
  const messageToSend = {
    recipient,
    templateName,
    params,
    // if recipient not in db, map.get(recipient) will return undefined
    // default to clientTwo in this case
    apiClient: apiClientIdMap.get(recipient) ?? WhatsAppApiClient.clientTwo,
    language: WhatsAppLanguages.english, // hardcode for now
  }
  // differential treatment based on local vs staging/prod
  // because WA API Client is inaccessible from local
  const isLocal = config.get('env') === 'development'
  await WhatsAppService.whatsappClient
    .validateSingleRecipient(messageToSend, isLocal)
    .catch((err) => {
      logger.error({
        message: 'Error validating recipient',
        action,
        error: err,
      })
      throw new ApiInvalidRecipientError(err.message)
    })

  const messageId = await WhatsAppService.whatsappClient
    .sendTemplateMessage(messageToSend, isLocal)
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
