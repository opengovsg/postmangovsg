import MailClient from './mail-client.class'
import config from '@core/config'

const mailClient = new MailClient(
  config.get('mailFrom'),
  config.get('mailOptions')
)

export const MailService = {
  mailClient,
}
