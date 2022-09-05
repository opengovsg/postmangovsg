import { TemplateError } from '@shared/templating'
import { SmsService, SmsTemplateService } from '@sms/services'
import { TwilioCredentials } from '@sms/interfaces'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

/**
 * Sanitizes an SMS message and sends it.
 * @throws TemplateError if the body is invalid
 * @throws Error if the message could not be sent
 */
async function sendMessage({
  credentials,
  body,
  recipient,
}: {
  credentials: TwilioCredentials
  body: string
  recipient: string
}): Promise<void> {
  const sanitizedBody =
    SmsTemplateService.client.replaceNewLinesAndSanitize(body)
  if (!sanitizedBody) {
    throw new TemplateError(
      'Message is invalid as it only contains invalid HTML tags.'
    )
  }

  logger.info({
    message: 'Sending transactional SMS',
    action: 'sendMessage',
  })
  await SmsService.sendMessage(credentials, recipient, sanitizedBody)
}

export const SmsTransactionalService = {
  sendMessage,
}
