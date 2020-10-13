import nodemailer from 'nodemailer'
import directTransport from 'nodemailer-direct-transport'
import Logger from '@core/logger'
import { MailToSend, MailCredentials } from '@email/interfaces'

const logger = Logger.loggerWithLabel(module)
const REFERENCE_ID_HEADER = 'X-SMTPAPI' // Case sensitive

export default class MailClient {
  private mailer: nodemailer.Transporter

  constructor(credentials: MailCredentials) {
    const { host, port, auth } = credentials

    if (!host) {
      logger.info({ message: 'Mailer: Using direct transport' })
      this.mailer = nodemailer.createTransport(directTransport({ debug: true }))
      return
    }

    if (!port || !auth.user || !auth.pass)
      throw new Error('Missing credentials while constructing MailService')

    logger.info({ message: 'Mailer: Using SMTP transport', host, port })
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
        from: input.from,
        to: input.recipients,
        subject: input.subject,
        replyTo: input.replyTo,
        html: input.body,
        headers: {},
      }
      if (input.referenceId !== undefined) {
        // Signature expected by Sendgrid
        // https://sendgrid.com/docs/for-developers/tracking-events/event/#unique-arguments
        const headerValue = JSON.stringify({
          unique_args: { message_id: input.referenceId },
        })
        options.headers = { [REFERENCE_ID_HEADER]: headerValue }
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
