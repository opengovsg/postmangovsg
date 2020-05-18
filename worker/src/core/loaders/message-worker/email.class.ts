
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import map from 'lodash/map'
import validator from 'validator'

import logger from '@core/logger'
import config from '@core/config'
import MailClient from '@email/services/mail-client.class'
import TemplateClient from '@core/services/template-client.class'


const validateEmailRecipient = (recipient: string): boolean => (validator.isEmail(recipient))
const templateClient = new TemplateClient(config.get('xssOptions.email'), validateEmailRecipient)

class Email {
    private workerId: string
    private connection: Sequelize
    private mailService: MailClient
    constructor(workerId: string, connection: Sequelize){
      this.workerId = workerId
      this.connection = connection
      this.mailService = new MailClient(config.get('mailFrom'), config.get('mailOptions'))
    }
   
    enqueueMessages(jobId: number): Promise<void>{
      return this.connection.query('SELECT enqueue_messages_email(:job_id); ',
        { replacements: { 'job_id': jobId }, type: QueryTypes.SELECT },
      ).then(() => {
        logger.info(`${this.workerId}: s_enqueueMessagesEmail job_id=${jobId}`)
      })
    }
    
    
    getMessages(jobId: number, rate: number): Promise<{id: number; recipient: string; params: {[key: string]: string}; body: string; subject: string; replyTo: string | null}[]> {
      return this.connection.query('SELECT get_messages_to_send_email(:job_id, :rate) ;',
        { replacements: { 'job_id': jobId, rate }, type: QueryTypes.SELECT },
      ).then((result) => (map(result, 'get_messages_to_send_email')))
    }
      
    sendMessage({ id, recipient, params, body, subject, replyTo }: { id: number; recipient: string; params: {[key: string]: string}; body: string; subject?: string; replyTo?: string | null }): Promise<void> {
      return Promise.resolve()
        .then(() => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return { subject: templateClient.template(subject!, params), hydratedBody: templateClient.template(body, params) }
        })
        .then(({ subject, hydratedBody }: {subject: string; hydratedBody: string}) => {
          return this.mailService.sendMail({
            recipients: [recipient],
            subject,
            body: hydratedBody,
            ...(replyTo ? { replyTo } : {}),
          })
        })
        .then((messageId) => {
          return this.connection.query('UPDATE email_ops SET delivered_at=clock_timestamp(), message_id=:messageId WHERE id=:id;',
            { replacements: { id, messageId }, type: QueryTypes.UPDATE })
        })
        .catch((error: Error) => {
          return this.connection.query('UPDATE email_ops SET delivered_at=clock_timestamp(), error_code=:error WHERE id=:id;',
            { replacements: { id, error: error.message.substring(0,255) }, type: QueryTypes.UPDATE })
        })
        .then(() => {
          logger.info(`${this.workerId}: sendMessage id=${id}`)
        })
    }

    async setSendingService(_: string): Promise<void> {
      // Do nothing
      return 
    }

    destroySendingService(): void {
      // Do nothing
      return
    }
}
 
export default Email