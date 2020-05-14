import MailClient from './mail-client.class'
import config from '@core/config'

const mailClient = new MailClient(config.mailFrom, config.mailOptions)

export const MailService = {
  mailClient,
}