import nodemailer from 'nodemailer'
import directTransport from 'nodemailer-direct-transport'
import { MailToSend, MailCredentials } from '@email/mail.interface'
import logger from '@core/logger'

export default class MailService {
  private email: string
  private mailer: nodemailer.Transporter

  constructor(email: string, credentials: MailCredentials) {
    const { host, port, auth } = credentials

    if (!email) throw new Error('Missing email from credentials while constructing MailService.')
    this.email = email

    if (!host) {
      logger.info('Mailer: Using direct transport')
      this.mailer = nodemailer.createTransport(directTransport({ debug:true }))
      return
    }

    if (!port || !auth.user || !auth.pass) throw new Error('Missing credentials while constructing MailService')

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
    return new Promise<string | void>((resolve,reject) => {
      this.mailer.sendMail({
        from: this.email,
        to: input.recipients,
        subject: input.subject,
        html: input.body,
      }, (err, info) => {
        if(err !== null){
          reject(new Error(`${err}`))
        }
        else{
          resolve(info.messageId)
        }
      })
    })
  }
}
