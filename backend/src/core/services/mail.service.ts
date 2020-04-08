import nodemailer from 'nodemailer'
import directTransport from 'nodemailer-direct-transport'
import { MailToSend } from '@core/interfaces'
import logger from '@core/logger'


export default class MailService {
  private email: string
  private mailer: nodemailer.Transporter

  constructor( email: string, host: string = '', port: string = '', user: string = '', password: string = '') {
    this.email = email
    if (!host) {
      logger.info('Mailer: Using direct transport')
      this.mailer = nodemailer.createTransport(directTransport({ debug:true }))
      return
    }
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

  public async sendMail(input : MailToSend) : Promise<boolean> {
    try {
      const sent: boolean = await new Promise((resolve,reject) => {
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
      })
      return sent
    }
    catch (err) {
      logger.error(err)
      return false
    }
  }
}