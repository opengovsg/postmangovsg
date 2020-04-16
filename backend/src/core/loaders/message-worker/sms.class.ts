import logger from '../../logger'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import get from 'lodash/get'

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
    
    
    getMessages(jobId: number, rate: number): Promise<{id: number; recipient: string; params: any, body: string}[]>   {
      return this.connection.query('SELECT get_messages_to_send_sms(:job_id, :rate) ;',
        { replacements: { 'job_id': jobId, rate }, type: QueryTypes.SELECT },
      ).then((result) => {
        return result.map(record => {
          const tuple = get(record, ('get_messages_to_send_sms'), '()')
          const [id, recipient, params, body] = tuple.substring(1, tuple.length - 1).split(',')
          return { id: +id, recipient, params: params && JSON.parse(params), body }
        })
      })
    }
      
    sendMessage({ id, recipient, params, body }: { id: number; recipient: string; params: string, body: string }): Promise<void> {
      return Promise.resolve()
        .then(() => {
        // do some sending get a response
          return `${id}.${recipient}.${body}.${params}`
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