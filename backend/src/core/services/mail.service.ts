import nodemailer from 'nodemailer'
import directTransport from 'nodemailer-direct-transport'
import { MailToSend, MailCredentials } from '@core/interfaces'
import logger from '@core/logger'


export class MailService {
  private email: string
  private mailer: nodemailer.Transporter

  constructor(credentials: MailCredentials) {
    const { email, host, port, user, password } = credentials

    if (!email) throw new Error('Missing email from credentials while constructing MailService.')
    this.email = email

    if (!host) {
      logger.info('Mailer: Using direct transport')
      this.mailer = nodemailer.createTransport(directTransport({ debug:true }))
      return
    }

    if (!port || !user || !password) throw new Error('Missing credentials while constructing MailService')

    logger.info('Mailer: Using SMTP transport')
    this.mailer = nodemailer.createTransport({
      host: host,
      port: Number(port),
      auth: {
        user: user,
        pass: password,
      }
    })
  }

  public async sendMail(input : MailToSend) {
    await new Promise((resolve,reject) => {
      this.mailer.sendMail({
        from: this.email,
        to: input.recipients,
        subject: input.subject,
        html: input.body,
      }, (err, info) => {
        if(err !== null){
          logger.error(String(err))
          reject(err)
        }
        else{
          logger.info(info)
          resolve(true)
        }
      })
    }).catch(err => {
      logger.error(err)
    })
  }
}