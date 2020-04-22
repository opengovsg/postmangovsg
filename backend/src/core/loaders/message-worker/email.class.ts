
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import map from 'lodash/map'
import MailService from '@core/services/mail.class'
import { template } from '@core/services'
import logger from '@core/logger'
import config from '@core/config'

class Email {
    private workerId: string
    private connection: Sequelize
    private mailService: MailService
    constructor(workerId: string, connection: Sequelize){
      this.workerId = workerId
      this.connection = connection
      this.mailService = new MailService('Postman.gov.sg <donotreply@mail.postman.gov.sg>', config.mailOptions)
    }
   
    enqueueMessages(jobId: number): Promise<void>{
      return this.connection.query('SELECT enqueue_messages_email(:job_id); ',
        { replacements: { 'job_id': jobId }, type: QueryTypes.SELECT },
      ).then(() => {
        logger.info(`${this.workerId}: s_enqueueMessagesEmail job_id=${jobId}`)
      })
    }
    
    
    getMessages(jobId: number, rate: number): Promise<{id: number; recipient: string; params: {[key: string]: string}; body: string; subject: string}[]> {
      return this.connection.query('SELECT get_messages_to_send_email(:job_id, :rate) ;',
        { replacements: { 'job_id': jobId, rate }, type: QueryTypes.SELECT },
      ).then((result) => (map(result, 'get_messages_to_send_email')))
    }
      
    sendMessage({ id, recipient, params, body, subject }: { id: number; recipient: string; params: {[key: string]: string}; body: string; subject?: string }): Promise<void> {
      return Promise.resolve()
        .then(() => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return { subject: template(subject!, params), hydratedBody: template(body, params) }
        })
        .then(({ subject, hydratedBody }: {subject: string; hydratedBody: string}) => {
          return this.mailService.sendMail({
            recipients: [recipient],
            subject,
            body: hydratedBody,
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