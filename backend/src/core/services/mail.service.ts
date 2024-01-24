import MailClient from '@shared/clients/mail-client.class'
import config from '@core/config'

const mailClient = new MailClient(
  config.get('mailOptions'),
  config.get('emailCallback.hashSecret'),
  config.get('emailFallback.activate') ? config.get('mailFrom') : undefined,
  config.get('mailConfigurationSet'),
  config.get('noTrackingMailConfigurationSet')
)

export const MailService = {
  mailClient,
}
