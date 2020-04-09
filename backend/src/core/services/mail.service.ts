import MailService from './mail.class'
import config from '@core/config'

const EMAIL = 'Postman.gov.sg <donotreply@mail.postman.gov.sg>'

export const mailClient = new MailService(EMAIL, config.mailOptions)