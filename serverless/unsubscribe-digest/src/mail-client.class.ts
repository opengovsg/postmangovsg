import nodemailer from 'nodemailer'
import directTransport from 'nodemailer-direct-transport'
import { Logger } from './utils/logger'
import { MailToSend, MailCredentials } from './interface'
const REFERENCE_ID_HEADER = 'X-SMTPAPI' // Case sensitive

const logger = new Logger('MailClient')

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
      logger.log('Mailer: Using direct transport')
      this.mailer = nodemailer.createTransport(directTransport({ debug: true }))
      return
    }

    if (!port || !auth.user || !auth.pass)
      throw new Error('Missing credentials while constructing MailService')

    logger.log('Mailer: Using SMTP transport')
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
