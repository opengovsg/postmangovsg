import MailClient, {
  MailToSend,
  SendEmailOpts,
} from '@shared/clients/mail-client.class'
import config from '@core/config'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)

const mailClient = new MailClient(
  config.get('mailOptions'),
  config.get('emailCallback.hashSecret'),
  config.get('emailFallback.activate') ? config.get('mailFrom') : undefined,
  config.get('mailConfigurationSet')
)

/**
 * Sends message
 * @param mail
 */
const sendEmail = async (
  mail: MailToSend,
  opts?: SendEmailOpts
): Promise<string | void> => {
  try {
    return NotificationService.mailClient.sendMail(mail, opts)
  } catch (e) {
    logger.error({
      message: 'Error while sending test email',
      error: e,
      action: 'sendEmail',
    })
    return
  }
}

export const NotificationService = {
  mailClient,
  sendEmail,
}
