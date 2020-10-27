import nodemailer from 'nodemailer'
import directTransport from 'nodemailer-direct-transport'
import logger from '@core/logger'
import { MailToSend, MailCredentials } from '@core/interfaces'
const REFERENCE_ID_HEADER = 'X-SMTPAPI' // Case sensitive
export default class MailClient {
  private mailer: nodemailer.Transporter
  /**
   * Constructs a node mailer instance if SES credentials are provided; otherwise uses local transport
   * @param credentials
   */
  constructor(credentials: MailCredentials) {
    const { host, port, auth } = credentials

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
