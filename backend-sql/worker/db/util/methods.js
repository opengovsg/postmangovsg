const fs = require('fs')
let sequelize = null
const truncateTables = () => {
  console.log('Truncating tables')
  return sequelize.query(
    `TRUNCATE users, job_queue, credentials, campaigns, workers,
        email_messages, email_templates, email_ops,
        sms_messages, sms_templates, sms_ops  RESTART IDENTITY;`,
  )
}

const createUser = () => {
  console.log('Creating user')
  return sequelize.query(
    `INSERT INTO users ("id", "email","created_at", "updated_at") VALUES 
        (1, 'test@test.gov.sg', clock_timestamp(), clock_timestamp());`,
  )
}

const createCredentials = (numEmailCredentials, numSmsCredentials) => {
  const numCreds = numEmailCredentials + numSmsCredentials
  console.log(`Creating ${numCreds} credentials`)
  let idx = 1
  let chain = Promise.resolve()
  if(numEmailCredentials>0){
    idx = idx + numEmailCredentials
    chain = chain.then(() => {
      return sequelize.query(`INSERT INTO credentials ("name", "created_at", "updated_at")
      SELECT concat('CRED-',generate_series(1, ${numEmailCredentials})),clock_timestamp(), clock_timestamp();`)
    })
  }
  if(numSmsCredentials>0){
    chain = chain.then(() => {
      return sequelize.query(`INSERT INTO credentials ("name", "created_at", "updated_at")
      SELECT concat('CRED-',generate_series(${idx}, ${numCreds})),clock_timestamp(), clock_timestamp();`)
    })
  }
  return chain
}

const createCampaigns = (numCampaignsPerCredential, numEmailCredentials, numSmsCredentials) => {
  const numCreds = numEmailCredentials + numSmsCredentials
  console.log(`Creating ${numCampaignsPerCredential} campaigns per credential, 
    for a total of ${numCampaignsPerCredential * numCreds} campaigns`)
  let idx = 1
  let chain = Promise.resolve()
  if(numEmailCredentials>0){
    idx = idx + numEmailCredentials
    chain = chain.then(() => {
      return sequelize.query(`
      INSERT INTO campaigns ("name", "user_id", "type", "cred_name", "valid", "created_at", "updated_at" ) 
      SELECT  t.name, t.user_id, enum_campaigns_type(t.type), t.cred_name, t.valid, t.created_at, t.updated_at 
      FROM  generate_series(1,${numEmailCredentials}) num_credentials
      CROSS JOIN LATERAL ( 
      SELECT generate_series(1,${numCampaignsPerCredential}) as num_campaign, 'email-campaign' as name, 1 as user_id, 'EMAIL' as type, concat('CRED-', num_credentials) as cred_name, TRUE as valid, 
      clock_timestamp() as created_at, clock_timestamp() as updated_at
      ) t;
    `)
    })
  }
  if(numSmsCredentials>0){
    chain = chain.then(() => {
      return sequelize.query(`
      INSERT INTO campaigns ("name", "user_id", "type", "cred_name", "valid", "created_at", "updated_at" ) 
      SELECT  t.name, t.user_id, enum_campaigns_type(t.type), t.cred_name, t.valid, t.created_at, t.updated_at 
      FROM  generate_series(${idx}, ${numCreds}) num_credentials
      CROSS JOIN LATERAL ( 
      SELECT generate_series(1,${numCampaignsPerCredential}) as num_campaign, 'sms-campaign' as name, 1 as user_id, 'SMS' as type, concat('CRED-', num_credentials) as cred_name, TRUE as valid, 
      clock_timestamp() as created_at, clock_timestamp() as updated_at
      ) t;
    `)
    })
  }
  return chain

  
}

const createTemplates = (numCampaignsPerCredential, numEmailCredentials, numSmsCredentials) => {
  const numTemplates = (numEmailCredentials + numSmsCredentials) * numCampaignsPerCredential
  console.log(`Creating ${numTemplates} templates`)
  let idx = 1
  let chain = Promise.resolve()
  if(numEmailCredentials>0){
    idx = idx + (numEmailCredentials * numCampaignsPerCredential)
    chain = chain.then(() => {
      return sequelize.query(`
        INSERT INTO email_templates ("campaign_id", "body", "subject", "created_at", "updated_at")
        SELECT generate_series(1,${numEmailCredentials * numCampaignsPerCredential}), 'body' as body, 'subject', clock_timestamp(), clock_timestamp();
      `)
    })
  }
  if(numSmsCredentials>0){
    chain = chain.then(() => {
      return sequelize.query(`
        INSERT INTO sms_templates ("campaign_id", "body", "created_at", "updated_at")
        SELECT generate_series(${idx},${numTemplates}), 'body' as body,  clock_timestamp(), clock_timestamp();
      `)
    })
  }
}

const createWorkers = (numWorkers) => {
  console.log(`Creating ${numWorkers} workers`)
  return sequelize.query(`
    INSERT INTO workers ("id",  "created_at", "updated_at") 
    SELECT generate_series(1,${numWorkers}) as id, clock_timestamp() as created_at, clock_timestamp() as updated_at;
    `)
}

const createData = (numRecipients, numCampaignsPerCredential, numEmailCredentials, numSmsCredentials) => {
  let idx = 1
  let chain = Promise.resolve()
  if(numEmailCredentials>0){
    console.log(`Creating ${numRecipients} recipients per email campaign, 
    for a total of ${numRecipients * numCampaignsPerCredential * numEmailCredentials} recipients`)
    idx = idx + (numEmailCredentials * numCampaignsPerCredential)
    chain = chain.then(() => {
      return sequelize.query(`
      INSERT INTO email_messages ("campaign_id", "recipient", "params", "created_at", "updated_at")
      SELECT t.* FROM  generate_series(1,${numRecipients}) num_recipient
      CROSS JOIN LATERAL ( 
      SELECT generate_series(1,${numCampaignsPerCredential * numEmailCredentials}) as "campaign_id", concat(num_recipient, 'test@test.gov.sg') as "recipient", CAST('{}' AS json) as "params",clock_timestamp() as "created_at", clock_timestamp() as "updated_at" 
      ) t;
      `)
    })
  }
  if(numSmsCredentials>0){
    console.log(`Creating ${numRecipients} recipients per sms campaign, 
    for a total of ${numRecipients * numCampaignsPerCredential * numSmsCredentials} recipients`)
    chain = chain.then(() => {
      return sequelize.query(`
      INSERT INTO sms_messages ("campaign_id", "recipient", "params", "created_at", "updated_at")
      SELECT t.* FROM  generate_series(1,${numRecipients}) num_recipient
      CROSS JOIN LATERAL (  
      SELECT generate_series(${idx},${numCampaignsPerCredential * (numSmsCredentials + numEmailCredentials)}) as "campaign_id", concat(num_recipient, 'test@test.gov.sg') as "recipient", CAST('{}' AS json) as "params",clock_timestamp() as "created_at", clock_timestamp() as "updated_at" 
      ) t;
      `)
    })
  }
  return chain
}

const insertJobs = (numCampaigns) => {
  console.log(`Creating ${numCampaigns} jobs`)
  return sequelize.query(
    `INSERT INTO job_queue ("campaign_id", "send_rate", "status", "created_at", "updated_at")
    SELECT generate_series(1,${numCampaigns}), 100 as send_rate, 'READY' as status, clock_timestamp() as created_at, clock_timestamp() as updated_at;
    `,
  )
}

const insertJob = (campaignId, sendRate = 100) => {
  console.log(`Creating one job for campaignId ${campaignId}`)
  return sequelize.query(`SELECT insert_job(${campaignId}, ${sendRate});`)
}

const stopJobs = (campaignId) => {
  console.log(`Stopping jobs for campaignId ${campaignId}`)
  return sequelize.query(`SELECT stop_jobs(${campaignId});`)
}

const retryJobs = (campaignId) => {
  console.log(`Retrying jobs for campaignId ${campaignId}`)
  return sequelize.query(`SELECT retry_jobs(${campaignId});`)
}

const createFunctionFromFile = (filePath) => {
  return new Promise((resolve, reject) => {
    console.log('Creating functions from' + filePath)
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  }).then((data) => {
    return sequelize.query(data)
  })
}

module.exports = (connection) => {
  sequelize = connection
  return {
    truncateTables,
    createUser,
    createCredentials,
    createCampaigns,
    createTemplates,
    createWorkers,
    createData,
    createFunctionFromFile,
    insertJobs,
    insertJob,
    stopJobs,
    retryJobs,
  }
}
