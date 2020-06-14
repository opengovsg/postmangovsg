import nodemailer from 'nodemailer'
import directTransport from 'nodemailer-direct-transport'
import logger from '@core/logger'
import { MailToSend, MailCredentials } from '@email/interfaces'
const REFERENCE_ID_HEADER = 'X-Postman-ID' // Case sensitive
export default class MailClient {
  private email: string
  private mailer: nodemailer.Transporter

  constructor(email: string, credentials: MailCredentials) {
    const { host, port, auth } = credentials

    if (!email)
      throw new Error(
        'Missing email from credentials while constructing MailService.'
      )
    this.email = email

    if (!host) {
      logger.info('Mailer: Using direct transport')
      this.mailer = nodemailer.createTransport(directTransport({ debug: true }))
      return
    }

    if (!port || !auth.user || !auth.pass)
      throw new Error('Missing credentials while constructing MailService')

    logger.info('Mailer: Using SMTP transport')
    this.mailer = nodemailer.createTransport({
      host: host,
      port: +port,
      auth: {
        user: auth.user,
        pass: auth.pass,
      },
    })
  }

  public sendMail(input: MailToSend): Promise<string | void> {
    return new Promise<string | void>((resolve, reject) => {
      const options = {
        from: this.email,
        to: input.recipients,
        subject: input.subject,
        replyTo: input.replyTo,
        html: input.body,
        headers: {},
      }
      if (input.referenceId !== undefined) {
        options.headers = { [REFERENCE_ID_HEADER]: input.referenceId }
      }
      this.mailer.sendMail(options, (err, info) => {
        if (err !== null) {
          reject(new Error(`${err}`))
        } else {
          resolve(info.messageId)
        }
      })
    })
  }
}
