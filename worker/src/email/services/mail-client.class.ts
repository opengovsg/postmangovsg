import nodemailer from 'nodemailer'
import directTransport from 'nodemailer-direct-transport'
import { loggerWithLabel } from '@core/logger'
import { MailToSend, MailCredentials } from '@email/interfaces'
import config from '@core/config'

const logger = loggerWithLabel(module)
const REFERENCE_ID_HEADER = 'X-SMTPAPI' // Case sensitive
const CONFIGURATION_SET_HEADER = 'X-SES-CONFIGURATION-SET' // Case sensitive

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
        from: config.get('emailFallback.activate')
          ? config.get('mailFrom')
          : input.from,
        to: input.recipients,
        subject: input.subject,
        replyTo: input.replyTo,
        html: input.body,
        headers: {
          [CONFIGURATION_SET_HEADER]: config.get('mailConfigurationSet'),
        },
      }
      if (input.referenceId !== undefined) {
        // Signature expected by Sendgrid
        // https://sendgrid.com/docs/for-developers/tracking-events/event/#unique-arguments
        const headerValue = JSON.stringify({
          unique_args: { message_id: input.referenceId },
        })
        options.headers = {
          ...options.headers,
          [REFERENCE_ID_HEADER]: headerValue,
        } as any
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
