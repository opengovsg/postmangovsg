
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import get from 'lodash/get'
import MailService from '@core/services/mail.class'
// import { template } from '@core/services'
import logger from '@core/logger'
import config from '@core/config'

class Email {
    private workerId: number
    private connection: Sequelize
    private mailService: MailService
    constructor(workerId: number, connection: Sequelize){
      this.workerId = workerId
      this.connection = connection
      this.mailService = new MailService('Postman.gov.sg <donotreply@mail.postman.gov.sg>', config.mailOptions)
    }
   
    enqueueMessages(jobId: number): Promise<void>{
      return this.connection.query('SELECT enqueue_messages_email(:job_id); ',
        { replacements: { 'job_id': jobId }, type: QueryTypes.SELECT },
      ).then(() => {
        logger.info(`${this.workerId}: s_enqueueMessagesSms job_id=${jobId}`)
      })
    }
    
    
    getMessages(jobId: number, rate: number): Promise<{id: number; recipient: string; params: any, body: string, subject: string}[]>   {
      return this.connection.query('SELECT get_messages_to_send_email(:job_id, :rate) ;',
        { replacements: { 'job_id': jobId, rate }, type: QueryTypes.SELECT },
      ).then((result) => {
        return result.map(record => {
          const tuple = get(record, ('get_messages_to_send_email'), '()')
          const [id, recipient, params, body, subject] = tuple.substring(1, tuple.length - 1).split(',')
          return { id: +id, recipient, params: params && JSON.parse(params), body, subject }
        })
      })
    }
      
    sendMessage({ id, recipient, params, body, subject }: { id: number; recipient: string; params: string, body: string, subject?: string }): Promise<void> {
      return Promise.resolve()
        .then(() => {
          return { subject: subject!, hydratedBody: `${id}.${recipient}.${body}.${params}` }
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
}
 
export default Email