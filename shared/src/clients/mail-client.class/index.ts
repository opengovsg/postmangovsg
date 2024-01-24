import nodemailer from 'nodemailer'
import { MailToSend, MailCredentials } from './interfaces'
import { escapeFromAddress } from '../../utils/from-address'
import { getSha256Hash } from '../../utils/crypto'

const REFERENCE_ID_HEADER = 'X-SMTPAPI' // Case sensitive
const CONFIGURATION_SET_HEADER = 'X-SES-CONFIGURATION-SET' // Case sensitive

export * from './interfaces'

export type SendEmailOpts = {
  extraSmtpHeaders: Record<string, any>
  disableTracking?: boolean
}

export default class MailClient {
  private mailer: nodemailer.Transporter
  private email: string
  private hashSecret: string
  private defaultConfigSet: string | undefined
  private noTrackingConfigSet: string | undefined

  constructor(
    credentials: MailCredentials,
    hashSecret: string,
    email?: string,
    defaultConfigSet?: string,
    noTrackingConfigSet?: string
  ) {
    const { host, port, auth } = credentials
    this.hashSecret = hashSecret
    this.email = email as string
    this.mailer = nodemailer.createTransport({
      host: host,
      port: +port,
      auth: {
        user: auth.user,
        pass: auth.pass,
      },
    })
    this.defaultConfigSet = defaultConfigSet
    this.noTrackingConfigSet = noTrackingConfigSet
  }

  public sendMail(
    input: MailToSend,
    option?: SendEmailOpts
  ): Promise<string | void> {
    return new Promise<string>((resolve, reject) => {
      const username = Math.random().toString(36).substring(2, 15) // random string
      const xSmtpHeader: { [key: string]: any } = {
        auth: {
          username,
          hash: getSha256Hash(this.hashSecret, username),
        },
        ...(option?.extraSmtpHeaders || {}), // guard against undefined extraSmtpHeaders value
      } as { [key: string]: any }
      if (input.messageId !== undefined) {
        // Signature expected by Sendgrid
        // https://sendgrid.com/docs/for-developers/tracking-events/event/#unique-arguments
        xSmtpHeader['unique_args'] = {
          message_id: input.messageId,
        }
      }
      let headers: any = {
        [REFERENCE_ID_HEADER]: JSON.stringify(xSmtpHeader),
      }
      headers = this.setSesConfigurationHeader(headers, option?.disableTracking)
      if (input.unsubLink) {
        headers = {
          ...headers,
          ['List-Unsubscribe']: `<${input.unsubLink}>`,
        }
      }
      const options: nodemailer.SendMailOptions = {
        from: this.email || escapeFromAddress(input.from as string),
        to: input.recipients,
        subject: input.subject,
        replyTo: input.replyTo,
        html: input.body,
        headers,
        attachments: input.attachments,
        bcc: input.bcc,
        cc: input.cc,
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

  private setSesConfigurationHeader(
    headers: object,
    disableTracking: boolean | undefined
  ): object {
    // 1. If there is no default config set, we will not set any configuration header
    if (!this.defaultConfigSet) {
      return headers
    }
    // 2. If the user wants to disable tracking and there is a no tracking configuration, we set it
    if (disableTracking && this.noTrackingConfigSet) {
      return {
        ...headers,
        // Configuration header does not include open and read notification
        [CONFIGURATION_SET_HEADER]: this.noTrackingConfigSet,
      }
    }
    // 3. Otherwise, we will use the default tracking SES configuration set
    return {
      ...headers,
      // Configuration header includes open and read notification
      [CONFIGURATION_SET_HEADER]: this.defaultConfigSet,
    }
  }
}
