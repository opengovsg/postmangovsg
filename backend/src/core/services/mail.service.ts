import MailClient from './mail-client.class'
import config from '@core/config'

const EMAIL = 'Postman.gov.sg <donotreply@mail.postman.gov.sg>'

const mailClient = new MailClient(EMAIL, config.mailOptions)

export const MailService = {
  mailClient,
}