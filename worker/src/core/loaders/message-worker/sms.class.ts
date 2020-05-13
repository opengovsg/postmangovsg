import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import map from 'lodash/map'
import { TemplateService } from '@core/services/template.service'
import { CredentialService } from '@core/services/credential.service'
import logger from '@core/logger'
import TwilioClient from '@sms/services/twilio-client.class'

class SMS {
    private workerId: string
    private connection: Sequelize
    private twilioClient: TwilioClient | null
    constructor(workerId: string, connection: Sequelize){
      this.workerId = workerId
      this.connection = connection
      this.twilioClient = null
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
          return this.twilioClient?.send(recipient, TemplateService.template(body, params))
        })
        .then((messageId) => {
          return this.connection.query('UPDATE sms_ops SET delivered_at=clock_timestamp(), message_id=:messageId WHERE id=:id;',
            { replacements: { id, messageId }, type: QueryTypes.UPDATE })
        })
        .catch((error: Error) => {
          return this.connection.query('UPDATE sms_ops SET delivered_at=clock_timestamp(), error_code=:error WHERE id=:id;',
            { replacements: { id,  error: error.message.substring(0,255) }, type: QueryTypes.UPDATE })
        })
        .then(() => {
          logger.info(`${this.workerId}: sendMessage id=${id}`)
        })
    }

    async setSendingService(credentialName: string): Promise<void> {
      const credentials = await CredentialService.getTwilioCredentials(credentialName)
      this.twilioClient = new TwilioClient(credentials)
    }

    destroySendingService(): void {
      this.twilioClient = null
    }
}

export default SMS