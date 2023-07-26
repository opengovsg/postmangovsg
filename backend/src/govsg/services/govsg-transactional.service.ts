import config from '@core/config'
import {
  ApiAuthenticationError,
  ApiInvalidRecipientError,
  ApiRateLimitError,
} from '@core/errors/rest-api.errors'
import { loggerWithLabel } from '@core/logger'
import { WhatsAppService } from '@core/services/whatsapp.service'
import {
  AuthenticationError,
  InvalidRecipientError,
  RateLimitError,
} from '@shared/clients/whatsapp-client.class/errors'
import {
  MessageId,
  NormalisedParam,
  WhatsAppApiClient,
  WhatsAppLanguages,
} from '@shared/clients/whatsapp-client.class/types'

const logger = loggerWithLabel(module)

export async function sendMessage({
  recipient,
  templateName,
  params,
  languageCode,
}: {
  recipient: string
  templateName: string
  params: NormalisedParam[]
  languageCode: WhatsAppLanguages
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
    language: languageCode,
  }
  // differential treatment based on local vs staging/prod
  // because WA API Client is inaccessible from local
  const isLocal = config.get('env') === 'development'
  try {
    const messageId = await WhatsAppService.whatsappClient.sendTemplateMessage(
      messageToSend,
      isLocal
    )
    return messageId
  } catch (err) {
    if (err instanceof AuthenticationError) {
      throw new ApiAuthenticationError(err.message)
    }
    if (err instanceof RateLimitError) {
      throw new ApiRateLimitError(err.message)
    }
    if (err instanceof InvalidRecipientError) {
      throw new ApiInvalidRecipientError(
        err.message + `. Recipient: ${recipient}`
      )
    }
    logger.error({
      message: 'Error sending message',
      action,
      error: err,
    })
    throw err
  }
}
