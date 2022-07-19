import config from './config'
import MailClient from '@shared/clients/mail-client.class'

export const mailClient = new MailClient(
  config.get('mailOptions'),
  config.get('mailOptions.callbackHashSecret'),
  config.get('mailFrom'),
)
