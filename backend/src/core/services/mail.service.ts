import config from '@core/config'
import MailClient from '@shared/clients/mail-client.class'

const mailClient = new MailClient(
  config.get('mailOptions'),
  config.get('emailCallback.hashSecret'),
  config.get('emailFallback.activate') ? config.get('mailFrom') : undefined
)

export const MailService = {
  mailClient,
}
