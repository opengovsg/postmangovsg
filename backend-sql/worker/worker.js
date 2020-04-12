const { QueryTypes } = require('sequelize')
const _ = require('lodash')
module.exports = class Worker {
  constructor(connection, workerId, verbose){
    this.connection = connection
    this.workerId = workerId
    this.verbose = verbose
    this.jobId = null // this is not necessary, I'm using it for logging
  }
  init() {
    return this.connection.query(`INSERT INTO workers ("id",  "created_at", "updated_at") VALUES 
        (:worker_id, clock_timestamp(), clock_timestamp()) ON CONFLICT (id) DO NOTHING;`, 
    { replacements: { worker_id: this.workerId  }, type: QueryTypes.INSERT }
    )
  }
   
  getNextJob(){
    return this.connection.query('SELECT get_next_job(:worker_id);',
      { replacements: { worker_id: this.workerId  }, type: QueryTypes.SELECT }
    ).then((result) => {
      const tuple = _.get(result, ('[0].get_next_job'),'()')
      const [jobId, campaignId] = tuple.substring(1, tuple.length-1).split(',')
      if(jobId) { this.log(`getNextJob job_id=${jobId} campaign_id=${campaignId}`) }
      return { jobId, campaignId }
    })
  }

  enqueueMessages(jobId) {
    return this.connection.query('CALL enqueue_messages(:job_id); ',
      { replacements: { job_id: jobId }, type: QueryTypes.CALL }
    ).then(() => {
      this.log(`enqueue job_id=${jobId}`)
    })
  }
    
  getMessages(jobId, limit){
    this.jobId = jobId
    return this.connection.query('SELECT get_messages_to_send(:job_id, :limit) ;',
      { replacements: { job_id: jobId, limit }, type: QueryTypes.SELECT }
    ).then((result) => {
      return result.map(record => {
        const tuple = _.get(record, ('get_messages_to_send'),'()')
        const [id, recipient, params] = tuple.substring(1, tuple.length-1).split(',')
        return { id, recipient, params: params && JSON.parse(params) }
      } )
    })
  }

  sendMessage({ id, recipient, params }){
    return this.connection.query('UPDATE email_ops SET message_id=\'test\' WHERE id=:id;',
      { replacements: { id }, type: QueryTypes.UPDATE }
    ).then(() => {
      this.log(`sendMessage jobId=${this.jobId} id=${id}`)
    })
  }

  finalize() {
    return this.connection.query('SELECT log_next_job();'
    ).then(([result, metadata]) => {
      const campaignId = _.get(result, ('[0].log_next_job'),'')
      if(campaignId) this.log(`finalized campaignId=${campaignId}`)
    })
  }

  log(data){
    if(this.verbose) console.log(`[${(new Date).toISOString()}][${this.workerId}]: \t`, data)
  }
}