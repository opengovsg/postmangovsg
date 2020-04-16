import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import map from 'lodash/get'
import { template } from '@core/services'
import logger from '@core/logger'

class SMS {
    private workerId: number
    private connection: Sequelize
    constructor(workerId: number, connection: Sequelize){
      this.workerId = workerId
      this.connection = connection
    }
   
    enqueueMessages(jobId: number): Promise<void>{
      return this.connection.query('SELECT enqueue_messages_sms(:job_id); ',
        { replacements: { 'job_id': jobId }, type: QueryTypes.SELECT },
      ).then(() => {
        logger.info(`${this.workerId}: s_enqueueMessagesSms job_id=${jobId}`)
      })
    }
    
    
    getMessages(jobId: number, rate: number): Promise<{id: number; recipient: string; params: {[key: string]: string}; body: string}[]>   {
      return this.connection.query('SELECT get_messages_to_send_sms(:job_id, :rate) ;',
        { replacements: { 'job_id': jobId, rate }, type: QueryTypes.SELECT },
      ).then((result) => (map(result, 'get_messages_to_send_sms')))
    }
      
    sendMessage({ id, recipient, params, body }: { id: number; recipient: string; params: {[key: string]: string}; body: string }): Promise<void> {
      return Promise.resolve()
        .then(() => {
          return { hydratedBody: template(body, params) }
        })
        .then(({ hydratedBody }: { hydratedBody: string}) => {
        // do some sending get a response
          return `${recipient}.${hydratedBody}`
        })
        .then((messageId) => {
          return this.connection.query('UPDATE sms_ops SET delivered_at=clock_timestamp(), message_id=:messageId WHERE id=:id;',
            { replacements: { id, messageId }, type: QueryTypes.UPDATE })
        })
        .then(() => {
          logger.info(`${this.workerId}: sendMessage id=${id}`)
        })
    } 
}

export default SMS