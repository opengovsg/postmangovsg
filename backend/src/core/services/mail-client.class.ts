import nodemailer from 'nodemailer'
import directTransport from 'nodemailer-direct-transport'
import { createCustomLogger } from '@core/utils/logger'
import { MailToSend, MailCredentials } from '@core/interfaces'
const REFERENCE_ID_HEADER = 'X-SMTPAPI' // Case sensitive
const logger = createCustomLogger(module)

export default class MailClient {
  private email: string
  private mailer: nodemailer.Transporter
  /**
   * Constructs a node mailer instance if SES credentials are provided; otherwise uses local transport
   * @param email email address that will be set in the From: field
   * @param credentials
   */
  constructor(email: string, credentials: MailCredentials) {
    const { host, port, auth } = credentials

    if (!email) {
      throw new Error(
        'Missing email from credentials while constructing MailService.'
      )
    }

    this.email = email

    if (!host) {
      logger.info({ message: 'Mailer: Using direct transport', email })
      this.mailer = nodemailer.createTransport(directTransport({ debug: true }))
      return
    }

    if (!port || !auth.user || !auth.pass) {
      throw new Error('Missing credentials while constructing MailService')
    }

    logger.info({ message: 'Mailer: Using SMTP transport', email, host, port })
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
          logger.error({
            message: 'Failed to send email',
            error: err,
            action: 'sendMail',
          })
          reject(new Error(`${err}`))
        } else {
          logger.info({
            message: 'Successfully sent email',
            messageId: info.messageId,
            action: 'sendMail',
          })
          resolve(info.messageId)
        }
      })
    })
  }
}
