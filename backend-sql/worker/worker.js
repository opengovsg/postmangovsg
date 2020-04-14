const { QueryTypes } = require('sequelize')
const _ = require('lodash')
module.exports = class Worker {
  constructor(connection, workerId, verbose) {
    this.connection = connection
    this.workerId = workerId
    this.verbose = verbose
    this.jobId = null // this is not necessary, I'm using it for logging
    this.campaignType = null
  }

  init() {
    // TODO: On respawn with this same workerId, look for any existing jobs that are in SENDING state, and resume it.
    // Currently resume_worker just stops all the jobs for that campaign id.
    return this.connection.query(`
        INSERT INTO workers ("id",  "created_at", "updated_at") VALUES 
        (:worker_id, clock_timestamp(), clock_timestamp()) ON CONFLICT (id) DO NOTHING;

        SELECT resume_worker(:worker_id);
    `,
    { replacements: { worker_id: this.workerId }, type: QueryTypes.INSERT },
    )
  }

  getNextJob() {
    return this.connection.query('SELECT get_next_job(:worker_id);',
      { replacements: { worker_id: this.workerId }, type: QueryTypes.SELECT },
    ).then((result) => {
      const tuple = _.get(result, ('[0].get_next_job'), '()')
      const [jobId, campaignId, campaignType] = tuple.substring(1, tuple.length - 1).split(',')
      if (jobId &&  campaignId && campaignType) {
        this.jobId = jobId
        this.campaignType = campaignType  
        this.log(`getNextJob job_id=${jobId} campaign_id=${campaignId} campaign_type=${campaignType}`) 
      }
      return { jobId, campaignId, campaignType }
    })
  }

  _enqueueMessagesSms(jobId){
    return this.connection.query('SELECT enqueue_messages_sms(:job_id); ',
    { replacements: { job_id: jobId }, type: QueryTypes.SELECT },
    ).then(() => {
      this.log(`_enqueueMessagesSms job_id=${jobId}`)
    })
  }

  _enqueueMessagesEmail(jobId){
    return this.connection.query('SELECT enqueue_messages_email(:job_id); ',
    { replacements: { job_id: jobId }, type: QueryTypes.SELECT },
    ).then(() => {
      this.log(`_enqueueMessagesSms job_id=${jobId}`)
    })
  }

  enqueueMessages(jobId) {
    switch(this.campaignType){
      case 'EMAIL':
        return this._enqueueMessagesEmail(jobId)
      case 'SMS':
        return this._enqueueMessagesSms(jobId)
      default:
        throw new Error(`${this.campaignType} not suppored`)
    }
   
  }

  _getMessagesSms(jobId,limit){
    return this.connection.query('SELECT get_messages_to_send_sms(:job_id, :limit) ;',
      { replacements: { job_id: jobId, limit }, type: QueryTypes.SELECT },
    ).then((result) => {
      return result.map(record => {
        const tuple = _.get(record, ('get_messages_to_send_sms'), '()')
        const [id, recipient, params] = tuple.substring(1, tuple.length - 1).split(',')
        return { id, recipient, params: params && JSON.parse(params) }
      })
    })
  }

  _getMessagesEmail(jobId, limit){
    return this.connection.query('SELECT get_messages_to_send_email(:job_id, :limit) ;',
      { replacements: { job_id: jobId, limit }, type: QueryTypes.SELECT },
    ).then((result) => {
      return result.map(record => {
        const tuple = _.get(record, ('get_messages_to_send_email'), '()')
        const [id, recipient, params] = tuple.substring(1, tuple.length - 1).split(',')
        return { id, recipient, params: params && JSON.parse(params) }
      })
    })
  }

  getMessages(jobId,limit) {
    switch(this.campaignType){
      case 'EMAIL':
        return this._getMessagesEmail(jobId,limit)
      case 'SMS':
        return this._getMessagesSms(jobId,limit)
      default:
        throw new Error(`${this.campaignType} not suppored`)
    }
  }

  _sendMessageSms({ id, recipient, params }){
    return Promise.resolve()
    .then(() => {
    // do some sending get a response
      return 'sms-test'
    })
    .then((messageId) => {
      return this.connection.query('UPDATE sms_ops SET delivered_at=clock_timestamp(), message_id=:messageId WHERE id=:id;',
        { replacements: { id, messageId }, type: QueryTypes.UPDATE })
    })
    .then(() => {
      this.log(`sendMessage jobId=${this.jobId} id=${id}`)
    })
  }
  

  _sendMessageEmail({ id, recipient, params }){
    return Promise.resolve()
    .then(() => {
    // do some sending get a response
      return 'email-test'
    })
    .then((messageId) => {
      return this.connection.query('UPDATE email_ops SET delivered_at=clock_timestamp(), message_id=:messageId WHERE id=:id;',
        { replacements: { id, messageId }, type: QueryTypes.UPDATE })
    })
    .then(() => {
      this.log(`sendMessage jobId=${this.jobId} id=${id}`)
    })
  }

  sendMessage(message) {
    switch(this.campaignType){
      case 'EMAIL':
        return this._sendMessageEmail(message)
      case 'SMS':
        return this._sendMessageSms(message)
      default:
        throw new Error(`${this.campaignType} not suppored`)
    }
  }

  finalize() {
    return this.connection.query('SELECT log_next_job();',
    ).then(([result, metadata]) => {
      const campaignId = _.get(result, ('[0].log_next_job'), '')
      if (campaignId) this.log(`finalized campaignId=${campaignId}`)
    })
  }

  log(data) {
    if (this.verbose) console.log(`[${(new Date()).toISOString()}][${this.workerId}]: \t`, data)
  }
}
