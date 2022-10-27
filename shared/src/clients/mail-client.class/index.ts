import nodemailer from 'nodemailer'
import { MailToSend, MailCredentials } from './interfaces'
import { escapeFromAddress } from '../../utils/from-address'
import { getSha256Hash } from '../../utils/crypto'

const REFERENCE_ID_HEADER = 'X-SMTPAPI' // Case sensitive
const CONFIGURATION_SET_HEADER = 'X-SES-CONFIGURATION-SET' // Case sensitive

export * from './interfaces'

export type SendEmailOpts = {
  extraSmtpHeaders: Record<string, any>
}

export default class MailClient {
  private mailer: nodemailer.Transporter
  private email: string
  private hashSecret: string
  private configSet: string | undefined

  constructor(
    credentials: MailCredentials,
    hashSecret: string,
    email?: string,
    configSet?: string
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
    this.configSet = configSet
  }

  public sendMail(
    input: MailToSend,
    option?: SendEmailOpts
  ): Promise<string | void> {
    return new Promise<string | void>((resolve, reject) => {
      const username = Math.random().toString(36).substring(2, 15) // random string
      const xSmtpHeader: { [key: string]: any } = {
        auth: {
          username,
          hash: getSha256Hash(this.hashSecret, username),
        },
        ...(option?.extraSmtpHeaders || {}), // guard against undefined extraSmtpHeaders value
      } as { [key: string]: any }
      if (input.referenceId !== undefined) {
        // Signature expected by Sendgrid
        // https://sendgrid.com/docs/for-developers/tracking-events/event/#unique-arguments
        xSmtpHeader['unique_args'] = {
          message_id: input.referenceId,
        }
      }
      let headers: any = {
        [REFERENCE_ID_HEADER]: JSON.stringify(xSmtpHeader),
      }
      if (this.configSet) {
        headers = {
          ...headers,
          // Specify this to configure callback endpoint for notifications other
          // than delivery and bounce through SES configuration set
          [CONFIGURATION_SET_HEADER]: this.configSet,
        }
      }
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
